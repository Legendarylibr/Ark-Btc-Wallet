import { NextRequest, NextResponse } from "next/server";
import { hashClientBinding } from "@/lib/client-binding";
import { assertApiSecurity } from "@/lib/inbound-security";
import {
  challengeMessage,
  consumeChallenge,
  hasChallenge,
} from "@/lib/crypto/challenges";
import { setSessionCookie } from "@/lib/crypto/cookie";
import { base64ToBytes, verify } from "@/lib/crypto/ed25519";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";
import { claimNonce, REGISTER_NONCE_SCOPE } from "@/lib/crypto/nonce-store";
import { verifyOrPinPubkey } from "@/lib/crypto/pubkey-pin";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";
import {
  createSession,
  isTimestampValid,
} from "@/lib/crypto/session-store";
import { barkd } from "@/lib/barkd";
import { hasWebAuthnCredential } from "@/lib/webauthn/store";
import { assertHardwareAuthForRegister } from "@/lib/webauthn/hardware-guard";
import { parseJsonBody } from "@/lib/safe-json";
import { readLimitedBody } from "@/lib/security/request-limits";
import { recordUnlockFailure } from "@/lib/crypto/unlock-rate-limit";

export async function POST(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await readLimitedBody(req);
  if (!body.ok) return body.response;
  const bodyText = body.text;

  try {
    const parsed = parseJsonBody<{
      publicKey?: string;
      challenge?: string;
      signature?: string;
      timestamp?: number;
      nonce?: string;
    }>(bodyText);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { publicKey, challenge, signature, timestamp, nonce } = parsed.data;
    if (!publicKey || !challenge || !signature || !timestamp || !nonce) {
      return NextResponse.json(
        { error: "Missing registration fields" },
        { status: 400 },
      );
    }

    if (!isTimestampValid(timestamp)) {
      return NextResponse.json({ error: "Invalid timestamp" }, { status: 401 });
    }

    if (!isValidNonceUuid(nonce)) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 401 });
    }

    if (!hasChallenge(challenge)) {
      return NextResponse.json(
        { error: "Challenge expired or invalid" },
        { status: 401 },
      );
    }

    const message = challengeMessage(challenge);
    const sig = base64ToBytes(signature);
    const pk = base64ToBytes(publicKey);
    const valid = await verify(sig, message, pk);
    if (!valid) {
      recordUnlockFailure(ip);
      return NextResponse.json(
        { error: "Invalid registration signature" },
        { status: 401 },
      );
    }

    if (!claimNonce(REGISTER_NONCE_SCOPE, nonce)) {
      return NextResponse.json({ error: "Replay detected" }, { status: 401 });
    }

    if (!(await barkd.walletExists())) {
      return NextResponse.json(
        { error: "barkd wallet required before registering a session" },
        { status: 503 },
      );
    }

    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
    }

    if (!hasWebAuthnCredential(fingerprint)) {
      return NextResponse.json(
        { error: "Register a hardware key or passkey first" },
        { status: 403 },
      );
    }

    const hwBlock = await assertHardwareAuthForRegister(
      req,
      fingerprint,
      bodyText,
    );
    if (hwBlock) return hwBlock;

    const pin = verifyOrPinPubkey(fingerprint, publicKey);
    if (!pin.ok) {
      return NextResponse.json({ error: pin.reason }, { status: 403 });
    }

    if (!consumeChallenge(challenge)) {
      return NextResponse.json(
        { error: "Challenge expired or invalid" },
        { status: 401 },
      );
    }

    const session = createSession(
      publicKey,
      fingerprint,
      hashClientBinding(req),
    );
    const res = NextResponse.json({
      ok: true,
      firstPin: pin.firstPin,
      ...(pin.firstPin ? { fingerprint } : {}),
    });
    setSessionCookie(res, session.id);
    return res;
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
