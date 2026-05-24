"use client";

import { base64ToBytes } from "@/lib/crypto/ed25519";
import { base64urlToBuffer } from "./prf";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function base64UrlToBytes(b64url: string): Uint8Array {
  return new Uint8Array(base64urlToBuffer(b64url));
}

async function sha256(data: BufferSource): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

/** WebAuthn rpIdHash = SHA-256(UTF-8 rpId) */
async function rpIdHash(rpId: string): Promise<Uint8Array> {
  return sha256(new TextEncoder().encode(rpId));
}

export async function verifySdkAuthenticationAssertion(options: {
  publicKeySpki: Uint8Array;
  credentialId: string;
  assertion: PublicKeyCredential;
  expectedChallengeB64url: string;
  expectedOrigin: string;
  expectedRpId: string;
  storedCounter: number;
}): Promise<{ ok: true; newCounter: number } | { ok: false; error: string }> {
  const { assertion, expectedChallengeB64url, expectedOrigin, expectedRpId } =
    options;

  const rawId = new Uint8Array(assertion.rawId);
  const expectedId = base64UrlToBytes(options.credentialId);
  if (
    rawId.length !== expectedId.length ||
    !rawId.every((b, i) => b === expectedId[i])
  ) {
    return { ok: false, error: "Wrong security key" };
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  const clientDataBytes = new Uint8Array(response.clientDataJSON);
  let clientData: { type?: string; challenge?: string; origin?: string };
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return { ok: false, error: "Invalid client data" };
  }

  if (clientData.type !== "webauthn.get") {
    return { ok: false, error: "Invalid assertion type" };
  }
  if (clientData.challenge !== expectedChallengeB64url) {
    return { ok: false, error: "Challenge mismatch" };
  }
  if (clientData.origin !== expectedOrigin) {
    return { ok: false, error: "Origin mismatch" };
  }

  const authData = new Uint8Array(response.authenticatorData);
  if (authData.length < 37) {
    return { ok: false, error: "Invalid authenticator data" };
  }

  const expectedHash = await rpIdHash(expectedRpId);
  for (let i = 0; i < 32; i++) {
    if (authData[i] !== expectedHash[i]) {
      return { ok: false, error: "RP ID mismatch" };
    }
  }

  const flags = authData[32];
  if ((flags & 0x04) === 0) {
    return { ok: false, error: "User verification required" };
  }

  const signCount =
    (authData[33] << 24) |
    (authData[34] << 16) |
    (authData[35] << 8) |
    authData[36];
  if (signCount <= options.storedCounter) {
    return { ok: false, error: "Authenticator counter replay" };
  }

  const clientDataHash = await sha256(clientDataBytes);
  const signed = new Uint8Array(authData.length + clientDataHash.length);
  signed.set(authData, 0);
  signed.set(clientDataHash, authData.length);

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "spki",
      toArrayBuffer(options.publicKeySpki),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    return { ok: false, error: "Invalid stored public key" };
  }

  const signature = new Uint8Array(response.signature);
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(signature),
    toArrayBuffer(signed),
  );

  if (!valid) {
    return { ok: false, error: "Invalid assertion signature" };
  }

  return { ok: true, newCounter: signCount };
}

/** Validate registration client data + UV (attestation chain not verified client-side). */
export async function verifySdkRegistrationClientData(options: {
  credential: PublicKeyCredential;
  expectedChallengeB64url: string;
  expectedOrigin: string;
  expectedRpId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const att = options.credential.response as AuthenticatorAttestationResponse;
  const clientDataBytes = new Uint8Array(att.clientDataJSON);
  let clientData: { type?: string; challenge?: string; origin?: string };
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return { ok: false, error: "Invalid client data" };
  }

  if (clientData.type !== "webauthn.create") {
    return { ok: false, error: "Invalid registration type" };
  }
  if (clientData.challenge !== options.expectedChallengeB64url) {
    return { ok: false, error: "Challenge mismatch" };
  }
  if (clientData.origin !== options.expectedOrigin) {
    return { ok: false, error: "Origin mismatch" };
  }

  const authDataRaw = att.getAuthenticatorData?.();
  if (!authDataRaw) {
    return { ok: false, error: "Invalid authenticator data" };
  }
  const authData = new Uint8Array(authDataRaw);
  if (authData.length < 37) {
    return { ok: false, error: "Invalid authenticator data" };
  }

  const expectedHash = await rpIdHash(options.expectedRpId);
  for (let i = 0; i < 32; i++) {
    if (authData[i] !== expectedHash[i]) {
      return { ok: false, error: "RP ID mismatch" };
    }
  }
  if ((authData[32] & 0x04) === 0) {
    return { ok: false, error: "User verification required" };
  }

  return { ok: true };
}

export function spkiFromStoredBase64(b64: string): Uint8Array {
  return base64ToBytes(b64);
}
