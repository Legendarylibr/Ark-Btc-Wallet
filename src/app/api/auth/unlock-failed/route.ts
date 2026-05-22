import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { consumeUnlockAttemptToken } from "@/lib/crypto/unlock-attempt-token";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { recordUnlockFailure } from "@/lib/crypto/unlock-rate-limit";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`unlock-failed:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await readLimitedBody(req);
  if (!body.ok) return body.response;

  const parsed = parseJsonBody<{ unlockToken?: string }>(body.text);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { unlockToken } = parsed.data;
  if (!unlockToken || !consumeUnlockAttemptToken(unlockToken)) {
    return NextResponse.json(
      { error: "Invalid or expired unlock token" },
      { status: 401 },
    );
  }

  recordUnlockFailure(ip);
  return NextResponse.json({ ok: true });
}
