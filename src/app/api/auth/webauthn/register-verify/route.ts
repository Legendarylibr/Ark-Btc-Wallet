import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { verifyHardwareRegistration } from "@/lib/webauthn/verify";
import { consumeSetupToken } from "@/lib/crypto/setup-token";
import { SETUP_TOKEN_HEADER } from "@/lib/webauthn/constants";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";

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

    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
    }

    const setup = consumeSetupToken(
      req.headers.get(SETUP_TOKEN_HEADER),
      fingerprint,
    );
    if (!setup) {
      return NextResponse.json(
        { error: "Setup token expired — prove vault ownership again" },
        { status: 401 },
      );
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
