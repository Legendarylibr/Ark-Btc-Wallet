import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { assertApiSecurity } from "@/lib/inbound-security";
import { barkd } from "@/lib/barkd";
import { hasWebAuthnCredential } from "@/lib/webauthn/store";
import { getWebAuthnConfig } from "@/lib/webauthn/config";
import { storeWebAuthnChallenge } from "@/lib/webauthn/challenges";
import { validateSetupToken } from "@/lib/crypto/setup-token";
import { SETUP_TOKEN_HEADER } from "@/lib/webauthn/constants";
import { clientIp, rateLimit } from "@/lib/crypto/rate-limit";

export async function GET(req: NextRequest) {
  const block = assertApiSecurity(req);
  if (block) return block;

  if (!rateLimit(`webauthn-reg:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    if (!(await barkd.walletExists())) {
      return NextResponse.json({ error: "barkd wallet required" }, { status: 503 });
    }
    const { fingerprint } = await barkd.walletStatus();
    if (!fingerprint) {
      return NextResponse.json({ error: "No barkd fingerprint" }, { status: 503 });
    }

    const setup = validateSetupToken(
      req.headers.get(SETUP_TOKEN_HEADER),
      fingerprint,
    );
    if (!setup) {
      return NextResponse.json(
        {
          error:
            "Vault proof required — sign the setup challenge with your passphrase key first",
        },
        { status: 401 },
      );
    }

    if (hasWebAuthnCredential(fingerprint)) {
      return NextResponse.json(
        { error: "Hardware key already registered" },
        { status: 400 },
      );
    }

    const { rpName, rpID } = getWebAuthnConfig(req);
    const userId = Buffer.from(fingerprint, "utf8").slice(0, 32);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: `ark-${fingerprint.slice(0, 8)}`,
      userID: userId,
      userDisplayName: "Ark Wallet",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    });

    storeWebAuthnChallenge(`reg:${fingerprint}`, options.challenge);

    return NextResponse.json({
      options,
      challenge: options.challenge,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not start hardware registration" },
      { status: 500 },
    );
  }
}
