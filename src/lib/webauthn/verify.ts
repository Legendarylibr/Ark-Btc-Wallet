import type { NextRequest } from "next/server";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getWebAuthnConfig } from "./config";
import { consumeWebAuthnChallenge as consumeChallenge } from "./challenges";
import {
  getWebAuthnCredential,
  saveWebAuthnCredential,
  syncWebAuthnCredentialFromDisk,
  updateWebAuthnCounter,
  type StoredWebAuthnCredential,
} from "./store";

function credForVerify(stored: StoredWebAuthnCredential) {
  return {
    id: stored.credentialId,
    publicKey: Buffer.from(stored.publicKey, "base64"),
    counter: stored.counter,
    transports: ["usb", "nfc", "ble", "internal", "hybrid"] as (
      | "usb"
      | "nfc"
      | "ble"
      | "internal"
      | "hybrid"
    )[],
  };
}

export async function verifyHardwareRegistration(
  request: NextRequest,
  fingerprint: string,
  expectedChallenge: string,
  response: RegistrationResponseJSON,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!consumeChallenge(`reg:${fingerprint}`, expectedChallenge)) {
    return { ok: false, error: "Registration challenge expired" };
  }

  const { rpID, origins } = getWebAuthnConfig(request);

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { ok: false, error: "Hardware registration failed" };
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;

    if (response.id !== credential.id) {
      return { ok: false, error: "Hardware credential mismatch" };
    }

    const saved = saveWebAuthnCredential(fingerprint, {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      registeredAt: Date.now(),
    });
    if (!saved) {
      return { ok: false, error: "Hardware key already registered" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid hardware registration" };
  }
}

export async function verifyHardwareAuthentication(
  request: NextRequest,
  fingerprint: string,
  expectedChallenge: string,
  response: AuthenticationResponseJSON,
  opId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stored =
    syncWebAuthnCredentialFromDisk(fingerprint) ??
    getWebAuthnCredential(fingerprint);
  if (!stored) {
    return { ok: false, error: "No hardware key registered for this wallet" };
  }

  if (response.id !== stored.credentialId) {
    return { ok: false, error: "Hardware credential mismatch" };
  }

  if (!consumeChallenge(`auth:${fingerprint}:${opId}`, expectedChallenge)) {
    return { ok: false, error: "Authentication challenge expired" };
  }

  const { rpID, origins } = getWebAuthnConfig(request);

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origins,
      expectedRPID: rpID,
      credential: credForVerify(stored),
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return { ok: false, error: "Hardware verification failed" };
    }

    updateWebAuthnCounter(
      fingerprint,
      verification.authenticationInfo.newCounter,
    );

    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid hardware authentication" };
  }
}
