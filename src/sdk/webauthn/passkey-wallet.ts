"use client";

import { bytesToBase64, base64ToBytes } from "@/lib/crypto/ed25519";
import {
  clearSdkMnemonicVault,
  loadSdkMnemonicBackupVault,
  loadSdkPasskeyWallet,
  saveSdkMnemonicBackupVault,
  saveSdkPasskeyWallet,
  sdkMnemonicVaultExists,
  sdkPasskeyWalletExists,
  type SdkPasskeyWalletRecord,
} from "@/lib/vault-storage";
import {
  decryptMnemonicWithPrfKey,
  deriveAesKeyFromPrf,
  encryptMnemonicWithPrfKey,
  verifyPasskeyVaultDecrypt,
} from "@/sdk/crypto/prf-vault";
import { encryptSecret } from "@/lib/crypto/vault";
import { zeroize } from "@/lib/crypto/vault";
import { getSdkWebAuthnConfig } from "./config";
import { consumeSdkChallenge, storeSdkChallenge } from "./challenges";
import {
  base64urlToBuffer,
  bufferToBase64url,
  extractPrfFirst,
  generatePrfSalt,
  isPrfSupported,
  prfEvalExtension,
  prfEvalOnCreateExtension,
} from "./prf";
import {
  consumeSdkPendingOp,
  createSdkPendingOp,
  type SdkPendingOpType,
} from "./pending-op";

export type SdkUnlockMode = "passkey" | "passphrase" | null;
export type { SdkPendingOpType };

export async function getSdkUnlockMode(): Promise<SdkUnlockMode> {
  if (await sdkPasskeyWalletExists()) return "passkey";
  if (await sdkMnemonicVaultExists()) return "passphrase";
  return null;
}

export async function hasPasskeyRecoveryBackup(): Promise<boolean> {
  return (await loadSdkMnemonicBackupVault()) != null;
}

async function assertWebAuthn(): Promise<void> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn is not available in this browser");
  }
}

async function saveRecoveryPassphraseVault(
  recoveryPassphrase: string,
  mnemonic: string,
): Promise<void> {
  const bytes = new TextEncoder().encode(mnemonic);
  try {
    const vault = await encryptSecret(recoveryPassphrase, bytes);
    await saveSdkMnemonicBackupVault(vault);
  } finally {
    zeroize(bytes);
  }
}

async function evaluatePrfWithCredential(
  credentialId: string,
  prfSalt: Uint8Array,
): Promise<ArrayBuffer> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: getSdkWebAuthnConfig().rpID,
      allowCredentials: [
        { id: base64urlToBuffer(credentialId), type: "public-key" },
      ],
      userVerification: "required",
      extensions: prfEvalExtension(prfSalt),
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Passkey authentication cancelled");

  const gotId = bufferToBase64url(assertion.rawId);
  if (gotId !== credentialId) {
    throw new Error("Passkey credential mismatch");
  }

  const prf = extractPrfFirst(assertion);
  if (!prf) {
    throw new Error("Could not derive wallet key from passkey (PRF failed)");
  }
  return prf;
}

/** PRF + decrypt vault — proves passkey matches stored wallet (no mnemonic returned). */
async function verifyPasskeyPrfForRecord(
  record: SdkPasskeyWalletRecord,
): Promise<void> {
  const { rpID } = getSdkWebAuthnConfig();
  const prfSalt = base64ToBytes(record.prfSalt);
  const prfOutput = await evaluatePrfWithCredential(
    record.credentialId,
    prfSalt,
  );
  const aesKey = await deriveAesKeyFromPrf(prfOutput, rpID);
  await verifyPasskeyVaultDecrypt(record.vault, aesKey);
}

/** Create passkey + PRF-encrypt mnemonic; recovery passphrase required */
export async function createSdkWalletWithPasskey(
  mnemonic: string,
  recoveryPassphrase: string,
): Promise<void> {
  await assertWebAuthn();
  if (!(await isPrfSupported())) {
    throw new Error(
      "Passkey PRF is not supported in this browser. Use recovery passphrase mode or try Chrome/Safari with Touch ID, Windows Hello, or a YubiKey 5.",
    );
  }

  if (await sdkPasskeyWalletExists()) {
    throw new Error("Wallet already exists");
  }

  const recovery = recoveryPassphrase.trim();
  if (!recovery) {
    throw new Error(
      "Recovery passphrase is required — you need it if this passkey is lost",
    );
  }

  const { rpID } = getSdkWebAuthnConfig();
  const walletId = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const prfSalt = generatePrfSalt();
  const { rpName } = getSdkWebAuthnConfig();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  storeSdkChallenge(`passkey-create:${walletId}`, challenge);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: rpName, id: rpID },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: "ark-sdk-wallet",
        displayName: "Ark Browser Wallet",
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required",
      },
      extensions: prfEvalOnCreateExtension(prfSalt),
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Passkey creation cancelled");

  const challengeB64 = bufferToBase64url(challenge.buffer);
  if (!consumeSdkChallenge(`passkey-create:${walletId}`, challengeB64)) {
    throw new Error("Passkey setup expired — try again");
  }

  let prfOutput = extractPrfFirst(credential);
  const credentialId = bufferToBase64url(credential.rawId);

  if (!prfOutput) {
    prfOutput = await evaluatePrfWithCredential(credentialId, prfSalt);
  }
  if (!prfOutput) {
    throw new Error(
      "This passkey does not support PRF. Try another authenticator (YubiKey 5, Touch ID, Windows Hello).",
    );
  }

  const aesKey = await deriveAesKeyFromPrf(prfOutput, rpID);
  const vault = await encryptMnemonicWithPrfKey(mnemonic, aesKey);

  const record: SdkPasskeyWalletRecord = {
    v: 1,
    walletId,
    prfSalt: bytesToBase64(prfSalt),
    credentialId,
    vault,
  };
  await saveSdkPasskeyWallet(record);
  await saveRecoveryPassphraseVault(recovery, mnemonic);
}

/** Fresh passkey tap + pending-op binding for Pay / Secure / rotate */
export async function confirmPasskeySensitiveOp(
  type: SdkPendingOpType,
  bodyHash: string,
): Promise<void> {
  await assertWebAuthn();
  const record = await loadSdkPasskeyWallet();
  if (!record) throw new Error("No passkey wallet");

  const opId = createSdkPendingOp(record.walletId, type, bodyHash);
  await verifyPasskeyPrfForRecord(record);

  if (!consumeSdkPendingOp(opId, record.walletId, type, bodyHash)) {
    throw new Error("Operation expired — try again");
  }
}

/** Unlock: passkey tap derives decryption key (no passphrase) */
export async function unlockSdkWalletWithPasskey(): Promise<string> {
  await assertWebAuthn();
  const record = await loadSdkPasskeyWallet();
  if (!record) throw new Error("No passkey wallet — create one first");

  const { rpID } = getSdkWebAuthnConfig();
  const prfSalt = base64ToBytes(record.prfSalt);
  const prfOutput = await evaluatePrfWithCredential(
    record.credentialId,
    prfSalt,
  );
  const aesKey = await deriveAesKeyFromPrf(prfOutput, rpID);
  return decryptMnemonicWithPrfKey(record.vault, aesKey);
}

/** Migrate passphrase-only wallet to passkey-primary; keeps recovery vault */
export async function upgradePassphraseWalletToPasskey(
  mnemonic: string,
  recoveryPassphrase: string,
): Promise<void> {
  await createSdkWalletWithPasskey(mnemonic, recoveryPassphrase);
  await clearSdkMnemonicVault();
}
