import { NextResponse } from "next/server";

type ApplyPayload = {
  name: string;
  email: string;
  experience: string;
  goal: string;
};

type ApplyResponse =
  | { ok: true }
  | { ok: false; error: string };

const MAX_FIELD = 2000;

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_FIELD).replace(/[<>]/g, "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

export async function POST(request: Request): Promise<NextResponse<ApplyResponse>> {
  let body: Partial<Record<keyof ApplyPayload, unknown>>;
  try {
    body = (await request.json()) as Partial<Record<keyof ApplyPayload, unknown>>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const payload: ApplyPayload = {
    name: sanitize(body.name),
    email: sanitize(body.email),
    experience: sanitize(body.experience),
    goal: sanitize(body.goal),
  };

  if (!payload.name || !isValidEmail(payload.email)) {
    return NextResponse.json(
      { ok: false, error: "Please provide your name and a valid email." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Degrade gracefully: never throw on missing configuration, and tell the
    // applicant plainly that the form path is down rather than spinning.
    console.error("apply: RESEND_API_KEY is unset; application not delivered", {
      name: payload.name,
      email: payload.email,
    });
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
    `Goal: ${payload.goal || "(not given)"}`,
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
