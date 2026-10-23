import { NextResponse } from "next/server";
import {
  APPLICATION_EMAIL_ADDRESS,
  normalizeApplication,
} from "@/lib/application";
import { deliverApplication } from "@/lib/application-delivery";
import { methodNotAllowed, routeOptions, type HttpMethod } from "@/lib/api-methods";

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

  // The email and the lead intake hub are two durable paths for the same
  // application (lib/application-delivery.ts). Either one landing is a
  // delivered application; the fallback below appears only when both failed.
  const delivery = await deliverApplication(normalized.value);
  if (delivery.delivered) {
    return NextResponse.json({ ok: true });
  }

  if (!delivery.email.ok && delivery.email.reason === "not-configured") {
    // Degrade gracefully: never throw on missing configuration, and tell the
    // applicant plainly that the form path is down rather than spinning.
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

// Methods this route does not serve answer 405 with an Allow header (lib/api-methods.ts).
const SERVED: readonly HttpMethod[] = ["POST"];
const notAllowed = methodNotAllowed(SERVED);
export const GET = notAllowed;
export const HEAD = notAllowed;
export const PUT = notAllowed;
export const DELETE = notAllowed;
export const PATCH = notAllowed;
export const OPTIONS = routeOptions(SERVED);
