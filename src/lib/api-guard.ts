import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { verifySignedRequest } from "@/lib/crypto/verify-request";

export type GuardedHandler = (
  request: NextRequest,
  bodyText: string,
) => Promise<NextResponse>;

/** Every wallet route: loopback Host/Origin + Ed25519 verification */
export function withCryptoGuard(
  handler: (request: NextRequest, bodyText: string) => Promise<NextResponse>,
): GuardedHandler {
  return async (request, bodyText) => {
    const block = assertApiSecurity(request);
    if (block) return block;

    const auth = await verifySignedRequest(request, bodyText);
    if (auth instanceof NextResponse) return auth;
    return handler(request, bodyText);
  };
}
