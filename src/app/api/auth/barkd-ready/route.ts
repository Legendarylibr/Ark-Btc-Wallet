import { NextRequest, NextResponse } from "next/server";
import { hashClientBinding } from "@/lib/client-binding";
import { assertApiSecurity } from "@/lib/inbound-security";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";
import { consumeUnlockAttemptToken } from "@/lib/crypto/unlock-attempt-token";
import { getPinnedPubkey } from "@/lib/crypto/pubkey-pin";
import { constantTimeEqualString } from "@/lib/crypto/secure-compare";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";

/**
 * Post-vault probe: unlock token + Ed25519 (vault signing key).
 * Before pairing: daemon reachability only. After pin: pinned pubkey + wallet file.
 */
export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`barkd-ready:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await readLimitedBody(req);
  if (!body.ok) return body.response;

  const parsed = parseJsonBody<{ unlockToken?: string }>(body.text);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { unlockToken } = parsed.data;
  const binding = hashClientBinding(req);
  if (
    !unlockToken ||
    !consumeUnlockAttemptToken(unlockToken, binding)
  ) {
    return NextResponse.json(
      { error: "Invalid or expired unlock token" },
      { status: 401 },
    );
  }

  const pre = await verifyPreSessionRequest(req, body.text);
  if (pre instanceof NextResponse) return pre;

  return withMinResponseDelay(async () => {
    try {
      const reachable = await barkd.daemonReachable();
      if (!reachable) {
        return NextResponse.json({ ready: false });
      }

      const { fingerprint } = await barkd.walletStatus();
      if (!fingerprint) {
        return NextResponse.json({ ready: false });
      }

      const pinned = getPinnedPubkey(fingerprint);
      if (pinned) {
        if (!constantTimeEqualString(pinned, pre.publicKeyB64)) {
          return NextResponse.json(
            { error: "Signing key does not match paired device" },
            { status: 403 },
          );
        }
        const ready = await barkd.walletExists();
        return NextResponse.json({ ready });
      }

      // First pairing: do not probe wallet file (register enforces it).
      return NextResponse.json({ ready: true });
    } catch {
      return NextResponse.json({ ready: false });
    }
  });
}
