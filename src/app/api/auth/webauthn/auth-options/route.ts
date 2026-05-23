import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";
import { barkd } from "@/lib/barkd";
import { getWebAuthnCredential } from "@/lib/webauthn/store";
import { getWebAuthnConfig } from "@/lib/webauthn/config";
import { storeWebAuthnChallenge } from "@/lib/webauthn/challenges";
import { atomicClaimPendingOpAuthOptions } from "@/lib/webauthn/pending-op-store";
import { getPendingOpDetails } from "@/lib/webauthn/pending-op";
import { verifyPendingOpCreatorAccess } from "@/lib/webauthn/verify-pending-op-access";
import { HARDWARE_AUTH_UNAVAILABLE } from "@/lib/webauthn/setup-gate";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

function hardwareAuthUnavailable(): NextResponse {
  return NextResponse.json(
    { error: HARDWARE_AUTH_UNAVAILABLE },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (!rateLimit(`webauthn-auth:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const opId = req.nextUrl.searchParams.get("opId");
  if (!opId || !isValidNonceUuid(opId)) {
    return NextResponse.json(
      { error: "Missing operation id — confirm a specific action first" },
      { status: 400 },
    );
  }

  try {
    const pending = getPendingOpDetails(opId);
    if (!pending) {
      return hardwareAuthUnavailable();
    }

    const creatorBlock = await verifyPendingOpCreatorAccess(
      req,
      pending.creatorPublicKeyB64,
    );
    if (creatorBlock) return creatorBlock;

    let fingerprint: string;
    try {
      const { fingerprint: fp } = await barkd.walletStatus();
      fingerprint = fp ?? "";
    } catch {
      return hardwareAuthUnavailable();
    }

    if (!fingerprint || fingerprint !== pending.fingerprint) {
      return hardwareAuthUnavailable();
    }

    const stored = getWebAuthnCredential(fingerprint);
    if (!stored) {
      return hardwareAuthUnavailable();
    }

    if (!atomicClaimPendingOpAuthOptions(opId, fingerprint)) {
      return hardwareAuthUnavailable();
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
