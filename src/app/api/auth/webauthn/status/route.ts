import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { hasWebAuthnCredential } from "@/lib/webauthn/store";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";

/**
 * Legacy probe — prefer client-side `getBarkHardwareRegistered()` after vault setup.
 * Rate-limited; same response shape on all failure paths.
 */
export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`webauthn-status:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return withMinResponseDelay(async () => {
    try {
      if (!(await barkd.walletExists())) {
        return NextResponse.json({ registered: false });
      }
      const { fingerprint } = await barkd.walletStatus();
      if (!fingerprint) {
        return NextResponse.json({ registered: false });
      }
      return NextResponse.json({
        registered: hasWebAuthnCredential(fingerprint),
      });
    } catch {
      return NextResponse.json({ registered: false });
    }
  });
}
