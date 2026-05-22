import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";

/** Daemon reachability only — does not reveal whether a barkd wallet file exists. */
export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`health:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return withMinResponseDelay(async () => {
    try {
      const ok = await barkd.daemonReachable();
      return NextResponse.json({ ok });
    } catch {
      return NextResponse.json({ ok: false });
    }
  });
}
