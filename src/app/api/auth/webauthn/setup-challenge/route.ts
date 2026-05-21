import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { issueChallenge } from "@/lib/crypto/challenges";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (!rateLimit(`webauthn-setup-ch:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { challenge, expiresAt } = issueChallenge();
  return NextResponse.json({ challenge, expiresAt });
}
