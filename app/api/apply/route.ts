import { NextResponse } from "next/server";
import {
  APPLICATION_EMAIL_ADDRESS,
  normalizeApplication,
} from "@/lib/application";

type ApplyResponse =
  | { ok: true }
  | {
      ok: false;
      error: string;
      fallback?: { kind: "email"; address: string };
    };

const emailFallback = {
  kind: "email" as const,
  address: APPLICATION_EMAIL_ADDRESS,
};

export async function POST(request: Request): Promise<NextResponse<ApplyResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const normalized = normalizeApplication(body);
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, error: normalized.error },
      { status: 400 },
    );
  }
  const payload = normalized.value;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Degrade gracefully: never throw on missing configuration, and tell the
    // applicant plainly that the form path is down rather than spinning.
    console.error("apply: RESEND_API_KEY is unset; application not delivered");
    return NextResponse.json(
      {
        ok: false,
        error:
          "Automatic delivery is temporarily offline. Use the email fallback below and we'll take it from there.",
        fallback: emailFallback,
      },
      { status: 503 },
    );
  }

  const text = [
    `New GuitarHub application`,
    ``,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Experience: ${payload.experience || "(not given)"}`,
    `Goal: ${payload.goal}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GuitarHub Applications <applications@guitarhub.org>",
      to: ["info@suedeai.ai"],
      reply_to: payload.email,
      subject: `GuitarHub application — ${payload.name}`,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("apply: email send failed", response.status, detail);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't submit your application just now. Use the email fallback below and we'll take it from there.",
        fallback: emailFallback,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
