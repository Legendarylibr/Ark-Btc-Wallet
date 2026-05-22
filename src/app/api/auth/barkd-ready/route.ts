import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { verifyPreSessionRequest } from "@/lib/crypto/pre-session";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { readLimitedBody } from "@/lib/security/request-limits";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";

/** Post-vault probe: requires Ed25519 proof (same key as unlock); not a public oracle. */
export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`barkd-ready:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await readLimitedBody(req);
  if (!body.ok) return body.response;

  const pre = await verifyPreSessionRequest(req, body.text);
  if (pre instanceof NextResponse) return pre;

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
