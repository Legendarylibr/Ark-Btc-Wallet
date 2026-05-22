import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { verifyHardwareRegistration } from "@/lib/webauthn/verify";
import { consumeSetupToken } from "@/lib/crypto/setup-token";
import { SETUP_TOKEN_HEADER } from "@/lib/webauthn/constants";
import { SETUP_PROOF_INCOMPLETE } from "@/lib/webauthn/setup-gate";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";

function setupIncomplete(): NextResponse {
  return NextResponse.json({ error: SETUP_PROOF_INCOMPLETE }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (!rateLimit(`webauthn-reg-v:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const raw = await readLimitedBody(req);
  if (!raw.ok) return raw.response;

  try {
    const parsed = parseJsonBody<{
      response?: RegistrationResponseJSON;
      challenge?: string;
    }>(raw.text);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const body = parsed.data;
    if (!body.response || !body.challenge) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!req.headers.get(SETUP_TOKEN_HEADER)) {
      return setupIncomplete();
    }

    let fingerprint: string;
    try {
      const { fingerprint: fp } = await barkd.walletStatus();
      if (!fp) {
        return setupIncomplete();
      }
      fingerprint = fp;
    } catch {
      return setupIncomplete();
    }

    const setup = consumeSetupToken(
      req.headers.get(SETUP_TOKEN_HEADER),
      fingerprint,
    );
    if (!setup) {
      return setupIncomplete();
    }

    const result = await verifyHardwareRegistration(
      req,
      fingerprint,
      body.challenge,
      body.response,
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Registration verify failed" }, { status: 500 });
  }
}
