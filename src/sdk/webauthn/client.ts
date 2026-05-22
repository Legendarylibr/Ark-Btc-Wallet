"use client";

import { hashBody } from "@/lib/crypto/canonical";
import { bytesToBase64, base64ToBytes } from "@/lib/crypto/ed25519";
import {
  loadSdkHardwareCredential,
  saveSdkHardwareCredential,
} from "@/lib/vault-storage";
import { loadSdkMnemonic } from "@/sdk/bark/mnemonic-vault";
import {
  spkiFromStoredBase64,
  verifySdkAuthenticationAssertion,
  verifySdkRegistrationClientData,
} from "@/sdk/webauthn/assertion-verify";
import { getSdkWebAuthnConfig } from "./config";
import { consumeSdkChallenge, storeSdkChallenge } from "./challenges";
import {
  consumeSdkPendingOp,
  createSdkPendingOp,
  type SdkPendingOpType,
} from "./pending-op";
import { getSdkWalletId } from "./wallet-id";

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export async function sdkHardwareRegistered(): Promise<boolean> {
  const walletId = await getSdkWalletId();
  const cred = await loadSdkHardwareCredential();
  return walletId != null && cred != null && cred.walletId === walletId;
}

/** Passphrase proves vault ownership before enrolling Touch ID / YubiKey */
export async function registerSdkHardware(passphrase: string): Promise<void> {
  if (
    typeof window === "undefined" ||
    !window.PublicKeyCredential
  ) {
    throw new Error("WebAuthn is not available in this browser");
  }

  await loadSdkMnemonic(passphrase);

  const walletId = await getSdkWalletId();
  if (!walletId) throw new Error("No SDK wallet");

  const existing = await loadSdkHardwareCredential();
  if (existing?.walletId === walletId) {
    throw new Error("Hardware key already registered");
  }

  const { rpName, rpID } = getSdkWebAuthnConfig();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = bufferToBase64url(challenge.buffer);
  storeSdkChallenge(`reg:${walletId}`, challenge);

  const userId = base64ToBytes(walletId).slice(0, 64);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: rpName, id: rpID },
      user: {
        id: userId,
        name: walletId.slice(0, 16),
        displayName: "Ark SDK Wallet",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Hardware registration cancelled");

  const att = credential.response as AuthenticatorAttestationResponse;
  const publicKey = att.getPublicKey();
  if (!publicKey) throw new Error("No public key from authenticator");

  if (!consumeSdkChallenge(`reg:${walletId}`, challengeB64)) {
    throw new Error("Registration challenge expired");
  }

  const regCheck = await verifySdkRegistrationClientData({
    credential,
    expectedChallengeB64url: challengeB64,
    expectedOrigin: window.location.origin,
    expectedRpId: rpID,
  });
  if (!regCheck.ok) {
    throw new Error(regCheck.error);
  }

  await saveSdkHardwareCredential({
    walletId,
    credentialId: bufferToBase64url(credential.rawId),
    publicKey: bytesToBase64(new Uint8Array(publicKey)),
    counter: 0,
  });
}

async function authenticateSdkHardware(
  walletId: string,
  opId: string,
): Promise<void> {
  const stored = await loadSdkHardwareCredential();
  if (!stored || stored.walletId !== walletId) {
    throw new Error("Register a hardware key first");
  }

  const { rpID } = getSdkWebAuthnConfig();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = bufferToBase64url(challenge.buffer);
  storeSdkChallenge(`auth:${walletId}:${opId}`, challenge);

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: rpID,
      allowCredentials: [
        {
          id: base64urlToBuffer(stored.credentialId),
          type: "public-key",
        },
      ],
      userVerification: "required",
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Device confirmation cancelled");

  if (!consumeSdkChallenge(`auth:${walletId}:${opId}`, challengeB64)) {
    throw new Error("Device confirmation expired — try again");
  }

  const verified = await verifySdkAuthenticationAssertion({
    publicKeySpki: spkiFromStoredBase64(stored.publicKey),
    credentialId: stored.credentialId,
    assertion,
    expectedChallengeB64url: challengeB64,
    expectedOrigin: window.location.origin,
    expectedRpId: rpID,
    storedCounter: stored.counter,
  });

  if (!verified.ok) {
    throw new Error(verified.error);
  }

  await saveSdkHardwareCredential({
    ...stored,
    counter: verified.newCounter,
  });
}

/** Bind hardware confirmation to a specific action (send, refresh, new address) */
export async function confirmSdkOperation(
  type: SdkPendingOpType,
  bodyHash: string,
): Promise<void> {
  const walletId = await getSdkWalletId();
  if (!walletId) throw new Error("No SDK wallet");

  const opId = createSdkPendingOp(walletId, type, bodyHash);
  await authenticateSdkHardware(walletId, opId);

  if (!consumeSdkPendingOp(opId, walletId, type, bodyHash)) {
    throw new Error("Operation expired — try again");
  }
}

export function sdkSendBodyHash(destination: string, amountSat: number): string {
  return hashBody(
    JSON.stringify({ destination: destination.trim(), amount_sat: amountSat }),
  );
}
