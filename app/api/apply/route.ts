import { NextResponse } from "next/server";
import { normalizeApplication } from "@/lib/application";

type ApplyResponse =
  | { ok: true }
  | { ok: false; error: string };

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
          "Applications are temporarily offline. Email info@suedeai.ai and we'll take it from there.",
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
          "We couldn't submit your application just now. Email info@suedeai.ai and we'll take it from there.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
