import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { hasWebAuthnCredential } from "@/lib/webauthn/store";

export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  try {
    if (!(await barkd.walletExists())) {
      return NextResponse.json({ registered: false });
    }
    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ registered: false });
    }
    return NextResponse.json({
      registered: hasWebAuthnCredential(fingerprint),
    });
  } catch {
    return NextResponse.json({ registered: false });
  }
}
