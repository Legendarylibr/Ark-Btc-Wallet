import { NextRequest } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { barkd } from "@/lib/barkd";
import { ensureEphemeralPruned } from "@/lib/security/ephemeral-init.server";
import { withMinResponseDelay } from "@/lib/security/min-response-delay";
import {
  secureJsonResponse,
  withApiSecurityHeaders,
} from "@/lib/security/api-headers";

/** Daemon reachability only — does not reveal whether a barkd wallet file exists. */
export async function GET(req: NextRequest) {
  ensureEphemeralPruned();
  const block = assertApiSecurity(req);
  if (block) return withApiSecurityHeaders(block);

  const ip = clientIp(req);
  if (!rateLimit(`health:${ip}`, 30, 60_000)) {
    return secureJsonResponse({ error: "Too many requests" }, { status: 429 });
  }

  return withMinResponseDelay(async () => {
    try {
      const ok = await barkd.daemonReachable();
      return secureJsonResponse({ ok });
    } catch {
      return secureJsonResponse({ ok: false });
    }
  });
}
