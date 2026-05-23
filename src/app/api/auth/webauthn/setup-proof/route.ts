import { NextRequest, NextResponse } from "next/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { issueSetupToken } from "@/lib/crypto/setup-token";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import {
  assertSetupAllowedForFingerprint,
  verifyWebauthnSetupProof,
} from "@/lib/webauthn/setup-proof";
import { SETUP_PROOF_INCOMPLETE } from "@/lib/webauthn/setup-gate";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";

function setupIncomplete(): NextResponse {
  return NextResponse.json({ error: SETUP_PROOF_INCOMPLETE }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`webauthn-setup:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const raw = await readLimitedBody(req);
  if (!raw.ok) return raw.response;

  try {
    const parsed = parseJsonBody<{
      publicKey?: string;
      challenge?: string;
      signature?: string;
      timestamp?: number;
      nonce?: string;
    }>(raw.text);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const proof = await verifyWebauthnSetupProof(parsed.data);
    if (!proof.ok) {
      rateLimit(`webauthn-setup-fail:${ip}`, 8, 15 * 60 * 1000);
      return NextResponse.json({ error: proof.error }, { status: 401 });
    }

    if (
      !rateLimit(
        `webauthn-setup-pk:${proof.publicKeyB64.slice(0, 16)}`,
        3,
        60_000,
      )
    ) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let fingerprint: string;
    try {
      const { fingerprint: fp } = await barkd.walletStatus();
      if (!fp || !(await barkd.walletExists())) {
        return setupIncomplete();
      }
      fingerprint = fp;
    } catch {
      return setupIncomplete();
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
