import { NextRequest, NextResponse } from "next/server";
import { hashClientBinding } from "@/lib/client-binding";
import { assertApiSecurity } from "@/lib/inbound-security";
import { issueUnlockAttemptToken } from "@/lib/crypto/unlock-attempt-token";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { unlockAttemptAllowed } from "@/lib/crypto/unlock-rate-limit";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`unlock-check:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!unlockAttemptAllowed(ip)) {
    return NextResponse.json(
      { allowed: false, error: "Too many unlock attempts — wait 15 minutes" },
      { status: 429 },
    );
  }

  const unlockToken = issueUnlockAttemptToken(hashClientBinding(req));
  return NextResponse.json({ allowed: true, unlockToken });
}
