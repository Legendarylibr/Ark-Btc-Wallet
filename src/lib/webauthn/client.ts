"use client";

import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type { UnlockedIdentity } from "@/lib/crypto/vault";
import { arkClientHeaders } from "@/lib/ark-client";
import { bytesToBase64, sign } from "@/lib/crypto/ed25519";
import { webauthnSetupMessage } from "@/lib/crypto/challenge-messages";
import {
  HARDWARE_AUTH_HEADER,
  PENDING_OP_HEADER,
  SETUP_TOKEN_HEADER,
} from "@/lib/webauthn/constants";
import { unlockVault, loadVaultFromStorage, zeroize } from "@/lib/crypto/vault";
import type { PendingOpType } from "@/lib/webauthn/pending-op-paths";
import { readResponseJson } from "@/lib/safe-json";
import { assertWebAuthnAvailable } from "@/lib/webauthn/availability";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...arkClientHeaders(),
      ...init?.headers,
    },
  });
  const data = await readResponseJson<{ error?: string } & T>(res);
  if (!res.ok) {
    throw new Error(data?.error ?? "Hardware request failed");
  }
  if (data == null) {
    throw new Error("Invalid response from server");
  }
  return data as T;
}

async function obtainSetupToken(identity: UnlockedIdentity): Promise<string> {
  const { challenge } = await apiJson<{ challenge: string }>(
    "/api/auth/webauthn/setup-challenge",
  );
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const message = webauthnSetupMessage(challenge);
  const signature = await sign(message, identity.privateKey);

  const { setupToken } = await apiJson<{ setupToken: string }>(
    "/api/auth/webauthn/setup-proof",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: bytesToBase64(identity.publicKey),
        challenge,
        signature: bytesToBase64(signature),
        timestamp,
        nonce,
      }),
    },
  );

  return setupToken;
}

/** Register YubiKey / Touch ID — requires passphrase to prove vault ownership */
export async function registerHardwareDevice(passphrase: string): Promise<void> {
  assertWebAuthnAvailable();
  const vault = await loadVaultFromStorage();
  if (!vault) throw new Error("No vault — set up a passphrase first");

  const identity = await unlockVault(passphrase, vault);
  try {
    const setupToken = await obtainSetupToken(identity);

    const { options, challenge } = await apiJson<{
      options: PublicKeyCredentialCreationOptionsJSON;
      challenge: string;
    }>("/api/auth/webauthn/register-options", {
      headers: { [SETUP_TOKEN_HEADER]: setupToken },
    });

    const attResp: RegistrationResponseJSON = await startRegistration({
      optionsJSON: options,
    });

    await apiJson("/api/auth/webauthn/register-verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SETUP_TOKEN_HEADER]: setupToken,
      },
      body: JSON.stringify({ response: attResp, challenge }),
    });
  } finally {
    zeroize(identity.privateKey);
  }
}

export async function createPendingOp(
  type: PendingOpType,
  bodyHash: string,
  signedFetchFn: (
    path: string,
    init: RequestInit,
  ) => Promise<Response>,
): Promise<string> {
  const res = await signedFetchFn("/api/auth/webauthn/pending-op", {
    method: "POST",
    body: JSON.stringify({ type, bodyHash }),
  });
  const data = await readResponseJson<{ opId?: string; error?: string }>(res);
  if (!res.ok) {
    throw new Error(data?.error ?? "Could not start secured operation");
  }
  if (!data?.opId) throw new Error("Missing operation id");
  return data.opId;
}

export async function authenticateWithHardware(
  opId: string,
  signedFetchFn: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<{
  response: AuthenticationResponseJSON;
  challenge: string;
  opId: string;
}> {
  assertWebAuthnAvailable();
  const path = `/api/auth/webauthn/auth-options?opId=${encodeURIComponent(opId)}`;
  const res = await signedFetchFn(path, { method: "GET" });
  const data = await readResponseJson<{
    options?: PublicKeyCredentialRequestOptionsJSON;
    challenge?: string;
    error?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data?.error ?? "Hardware request failed");
  }
  if (!data?.options || !data.challenge) {
    throw new Error("Invalid response from server");
  }
  const { options, challenge } = data;

  const authResp = await startAuthentication({ optionsJSON: options });
  return { response: authResp, challenge, opId };
}

/** Payload for x-wallet-hardware-auth + x-wallet-pending-op headers */
export async function hardwareAuthHeaders(
  opId: string,
  signedFetchFn: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<Record<string, string>> {
  const { response, challenge } = await authenticateWithHardware(
    opId,
    signedFetchFn,
  );
  return {
    [HARDWARE_AUTH_HEADER]: JSON.stringify({ response, challenge, opId }),
    [PENDING_OP_HEADER]: opId,
  };
}

