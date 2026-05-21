import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { issueSetupToken } from "@/lib/crypto/setup-token";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import {
  assertSetupAllowedForFingerprint,
  verifyWebauthnSetupProof,
} from "@/lib/webauthn/setup-proof";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`webauthn-setup:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = (await req.json()) as {
      publicKey?: string;
      challenge?: string;
      signature?: string;
      timestamp?: number;
      nonce?: string;
    };

    const proof = await verifyWebauthnSetupProof(body);
    if (!proof.ok) {
      rateLimit(`webauthn-setup-fail:${ip}`, 8, 15 * 60 * 1000);
      return NextResponse.json({ error: proof.error }, { status: 401 });
    }

    if (!(await barkd.walletExists())) {
      return NextResponse.json({ error: "barkd wallet required" }, { status: 503 });
    }
    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
    }

    const allowed = assertSetupAllowedForFingerprint(
      fingerprint,
      proof.publicKeyB64,
    );
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 403 });
    }

    const setupToken = issueSetupToken(proof.publicKeyB64, fingerprint);
    return NextResponse.json({ setupToken, expiresIn: 600 });
  } catch {
    return NextResponse.json({ error: "Setup proof failed" }, { status: 500 });
  }
}
