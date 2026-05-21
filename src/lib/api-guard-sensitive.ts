import { NextRequest, NextResponse } from "next/server";
import { withCryptoGuard } from "@/lib/api-guard";
import {
  assertHardwareAuth,
  getSessionFingerprint,
} from "@/lib/webauthn/hardware-guard";

/** Ed25519 + loopback checks + fresh WebAuthn touch (Pay, Secure, etc.) */
export function withSensitiveCryptoGuard(
  handler: (request: NextRequest, bodyText: string) => Promise<NextResponse>,
) {
  return withCryptoGuard(async (request, bodyText) => {
    const fingerprint = getSessionFingerprint(request);
    if (!fingerprint) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }
    const hwBlock = await assertHardwareAuth(request, fingerprint, bodyText);
    if (hwBlock) return hwBlock;
    return handler(request, bodyText);
  });
}
