import { base64ToBytes, verify } from "@/lib/crypto/ed25519";
import {
  consumeChallenge,
  hasChallenge,
  webauthnSetupMessage,
} from "@/lib/crypto/challenges";
import { isTimestampValid } from "@/lib/crypto/session-store";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";
import { claimNonce, REGISTER_NONCE_SCOPE } from "@/lib/crypto/nonce-store";
import { constantTimeEqualString } from "@/lib/crypto/secure-compare";
import { getPinnedPubkey } from "@/lib/crypto/pubkey-pin";
import { hasWebAuthnCredential } from "./store";

export async function verifyWebauthnSetupProof(body: {
  publicKey?: string;
  challenge?: string;
  signature?: string;
  timestamp?: number;
  nonce?: string;
}): Promise<
  | { ok: true; publicKeyB64: string }
  | { ok: false; error: string }
> {
  const { publicKey, challenge, signature, timestamp, nonce } = body;
  if (
    !publicKey ||
    !challenge ||
    !signature ||
    timestamp == null ||
    !nonce
  ) {
    return { ok: false, error: "Missing setup proof fields" };
  }

  if (!isTimestampValid(timestamp)) {
    return { ok: false, error: "Invalid timestamp" };
  }

  if (!isValidNonceUuid(nonce)) {
    return { ok: false, error: "Invalid nonce" };
  }

  if (!hasChallenge(challenge)) {
    return { ok: false, error: "Challenge expired or invalid" };
  }

  let pk: Uint8Array;
  let sig: Uint8Array;
  try {
    pk = base64ToBytes(publicKey);
    sig = base64ToBytes(signature);
  } catch {
    return { ok: false, error: "Invalid key material" };
  }

  const message = webauthnSetupMessage(challenge);
  const valid = await verify(sig, message, pk);
  if (!valid) {
    return { ok: false, error: "Invalid setup signature" };
  }

  if (!claimNonce(`${REGISTER_NONCE_SCOPE}:webauthn-setup`, nonce)) {
    return { ok: false, error: "Replay detected" };
  }

  if (!consumeChallenge(challenge)) {
    return { ok: false, error: "Challenge expired or invalid" };
  }

  return { ok: true, publicKeyB64: publicKey };
}

export function assertSetupAllowedForFingerprint(
  fingerprint: string,
  publicKeyB64: string,
): { ok: true } | { ok: false; error: string } {
  if (hasWebAuthnCredential(fingerprint)) {
    return { ok: false, error: "Hardware key already registered" };
  }

  const pinned = getPinnedPubkey(fingerprint);
  if (pinned && !constantTimeEqualString(pinned, publicKeyB64)) {
    return {
      ok: false,
      error: "Signing key does not match this barkd wallet",
    };
  }

  return { ok: true };
}
