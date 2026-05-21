"use client";

import { bytesToBase64, base64ToBytes } from "@/lib/crypto/ed25519";
import { zeroize } from "@/lib/crypto/vault";

export const PRF_VAULT_VERSION = 1;

/** Domain-separate HKDF info — include rpId so keys are not portable across origins */
export function prfHkdfInfo(rpId: string): Uint8Array {
  return new TextEncoder().encode(`ark-wallet-sdk-prf-v1-aes-gcm:${rpId}`);
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

export interface PrfEncryptedVault {
  v: number;
  iv: string;
  ciphertext: string;
}

/** Derive AES-256-GCM key from raw 32-byte PRF output (HKDF expand). */
export async function deriveAesKeyFromPrf(
  prfOutput: ArrayBuffer,
  rpId: string,
): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: toBufferSource(prfHkdfInfo(rpId)),
    },
    ikm,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMnemonicWithPrfKey(
  mnemonic: string,
  aesKey: CryptoKey,
): Promise<PrfEncryptedVault> {
  const bytes = new TextEncoder().encode(mnemonic);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    aesKey,
    toBufferSource(bytes),
  );
  const vault = {
    v: PRF_VAULT_VERSION,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
  zeroize(bytes);
  return vault;
}

/** Prove PRF output opens the vault without returning the mnemonic to callers. */
export async function verifyPasskeyVaultDecrypt(
  vault: PrfEncryptedVault,
  aesKey: CryptoKey,
): Promise<void> {
  const mnemonic = await decryptMnemonicWithPrfKey(vault, aesKey);
  const bytes = new TextEncoder().encode(mnemonic);
  zeroize(bytes);
}

export async function decryptMnemonicWithPrfKey(
  vault: PrfEncryptedVault,
  aesKey: CryptoKey,
): Promise<string> {
  if (vault.v !== PRF_VAULT_VERSION) {
    throw new Error("Unsupported passkey vault version");
  }

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBufferSource(base64ToBytes(vault.iv)) },
      aesKey,
      toBufferSource(base64ToBytes(vault.ciphertext)),
    );
    const mnemonic = new TextDecoder().decode(plain);
    if (!mnemonic.includes(" ")) {
      throw new Error("Decryption failed");
    }
    return mnemonic;
  } catch {
    throw new Error("Wrong passkey or corrupted wallet data");
  }
}
