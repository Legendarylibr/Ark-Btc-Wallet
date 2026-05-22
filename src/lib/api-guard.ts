import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { verifySignedRequest } from "@/lib/crypto/verify-request";
import { readLimitedBody } from "@/lib/security/request-limits";
import { withApiSecurityHeaders } from "@/lib/security/api-headers";
import { ensureEphemeralPruned } from "@/lib/security/ephemeral-init.server";

export type GuardedHandler = (
  request: NextRequest,
  bodyText: string,
) => Promise<NextResponse>;

/** Run Ed25519 + inbound checks when the body was already read (size-limited). */
export async function runCryptoGuard(
  request: NextRequest,
  bodyText: string,
  handler: GuardedHandler,
): Promise<NextResponse> {
  ensureEphemeralPruned();
  const block = assertApiSecurity(request);
  if (block) return withApiSecurityHeaders(block);

  const auth = await verifySignedRequest(request, bodyText);
  if (auth instanceof NextResponse) return withApiSecurityHeaders(auth);
  return handler(request, bodyText);
}

/** Every wallet route: loopback Host/Origin + Ed25519 verification + body cap */
export function withCryptoGuard(handler: GuardedHandler): (
  request: NextRequest,
) => Promise<NextResponse> {
  return async (request) => {
    const body = await readLimitedBody(request);
    if (!body.ok) return withApiSecurityHeaders(body.response);
    return runCryptoGuard(request, body.text, handler);
  };
}
