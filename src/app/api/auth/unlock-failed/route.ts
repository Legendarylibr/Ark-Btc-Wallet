import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { clientIp } from "@/lib/crypto/rate-limit";
import { recordUnlockFailure } from "@/lib/crypto/unlock-rate-limit";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  recordUnlockFailure(clientIp(req));
  return NextResponse.json({ ok: true });
}
