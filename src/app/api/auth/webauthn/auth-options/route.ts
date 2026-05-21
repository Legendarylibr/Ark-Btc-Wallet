import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { getWebAuthnCredential } from "@/lib/webauthn/store";
import { getWebAuthnConfig } from "@/lib/webauthn/config";
import { storeWebAuthnChallenge } from "@/lib/webauthn/challenges";
import { hasPendingOp } from "@/lib/webauthn/pending-op";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (!rateLimit(`webauthn-auth:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const opId = req.nextUrl.searchParams.get("opId");
  if (!opId) {
    return NextResponse.json(
      { error: "Missing operation id — confirm a specific action first" },
      { status: 400 },
    );
  }

  try {
    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
    }

    if (!hasPendingOp(opId, fingerprint)) {
      return NextResponse.json(
        { error: "No pending operation for this action" },
        { status: 400 },
      );
    }

    const stored = getWebAuthnCredential(fingerprint);
    if (!stored) {
      return NextResponse.json(
        { error: "Register a hardware key first" },
        { status: 400 },
      );
    }

    const { rpID } = getWebAuthnConfig(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [
        {
          id: stored.credentialId,
          transports: ["usb", "nfc", "ble", "internal", "hybrid"],
        },
      ],
      userVerification: "required",
    });

    storeWebAuthnChallenge(`auth:${fingerprint}:${opId}`, options.challenge);

    return NextResponse.json({
      options,
      challenge: options.challenge,
      opId,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not start hardware authentication" },
      { status: 500 },
    );
  }
}
