import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp } from "@/lib/crypto/rate-limit";
import { unlockAttemptAllowed } from "@/lib/crypto/unlock-rate-limit";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!unlockAttemptAllowed(ip)) {
    return NextResponse.json(
      { allowed: false, error: "Too many unlock attempts — wait 15 minutes" },
      { status: 429 },
    );
  }

  return NextResponse.json({ allowed: true });
}
