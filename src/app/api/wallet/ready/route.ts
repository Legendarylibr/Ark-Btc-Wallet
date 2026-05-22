import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";

/** Pre-session: daemon up and a barkd wallet file exists (no fingerprint). */
export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`wallet-ready:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return withMinResponseDelay(async () => {
    try {
      const reachable = await barkd.daemonReachable();
      if (!reachable) {
        return NextResponse.json({ ready: false });
      }
      const ready = await barkd.walletExists();
      return NextResponse.json({ ready });
    } catch {
      return NextResponse.json({ ready: false });
    }
  });
}
