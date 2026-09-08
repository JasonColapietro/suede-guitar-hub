/** OAuth is not enabled in the existing-account email-code release. */
export async function GET(request: Request) {
  return new Response(null, { status: 303, headers: {
    Location: new URL("/account?error=sign_in", request.url).toString(),
    "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
  } });
}
