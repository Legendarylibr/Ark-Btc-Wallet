import { scrypt } from "@noble/hashes/scrypt.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  base64ToBytes,
  bytesToBase64,
  generateKeypair,
} from "./ed25519";

const VAULT_VERSION = 2;
const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedVault {
  v: number;
  salt: string;
  iv: string;
  ciphertext: string;
  publicKey: string;
  mac: string;
}

export interface UnlockedIdentity {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export function zeroize(bytes: Uint8Array): void {
  bytes.fill(0);
}

function toBufferSource(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

async function deriveKeys(
  passphrase: string,
  salt: Uint8Array,
): Promise<{ aesKey: CryptoKey; macKey: Uint8Array }> {
  const material = scrypt(passphrase.normalize("NFKC"), salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: 64,
  });
  const encKey = material.slice(0, 32);
  const macKey = material.slice(32, 64);
  const aesKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(encKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return { aesKey, macKey };
}

function vaultMac(macKey: Uint8Array, parts: Omit<EncryptedVault, "mac">): string {
  const payload = JSON.stringify(parts);
  return bytesToBase64(hmac(sha256, macKey, new TextEncoder().encode(payload)));
}

function verifyVaultMac(
  macKey: Uint8Array,
  vault: EncryptedVault,
): boolean {
  const { mac, ...rest } = vault;
  const expected = vaultMac(macKey, rest);
  if (mac.length !== expected.length) return false;
  const a = new TextEncoder().encode(mac);
  const b = new TextEncoder().encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Encrypt arbitrary secret bytes (e.g. BIP39 mnemonic) with the same vault format */
export async function encryptSecret(
  passphrase: string,
  secret: Uint8Array,
): Promise<EncryptedVault> {
  const { publicKey } = await generateKeypair();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const { aesKey, macKey } = await deriveKeys(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    aesKey,
    toBufferSource(secret),
  );
  const partial = {
    v: VAULT_VERSION,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    publicKey: bytesToBase64(publicKey),
  };
  return {
    ...partial,
    mac: vaultMac(macKey, partial),
  };
}

export async function decryptSecret(
  passphrase: string,
  vault: EncryptedVault,
): Promise<Uint8Array> {
  const identity = await unlockVault(passphrase, vault);
  const copy = new Uint8Array(identity.privateKey);
  zeroize(identity.privateKey);
  return copy;
}

export async function createVault(
  passphrase: string,
): Promise<{ vault: EncryptedVault; identity: UnlockedIdentity }> {
  const { publicKey, privateKey } = await generateKeypair();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const { aesKey, macKey } = await deriveKeys(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toBufferSource(iv) },
    aesKey,
    toBufferSource(privateKey),
  );

  const partial = {
    v: VAULT_VERSION,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    publicKey: bytesToBase64(publicKey),
  };
  const vault: EncryptedVault = {
    ...partial,
    mac: vaultMac(macKey, partial),
  };

  return { vault, identity: { publicKey, privateKey } };
}

export async function unlockVault(
  passphrase: string,
  vault: EncryptedVault,
): Promise<UnlockedIdentity> {
  if (vault.v !== VAULT_VERSION) {
    throw new Error("Unsupported vault version — create a new signing identity");
  }

  const salt = base64ToBytes(vault.salt);
  const iv = base64ToBytes(vault.iv);
  const { aesKey, macKey } = await deriveKeys(passphrase, salt);

  if (!verifyVaultMac(macKey, vault)) {
    throw new Error("Vault integrity check failed");
  }

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toBufferSource(iv) },
      aesKey,
      toBufferSource(base64ToBytes(vault.ciphertext)),
    );
    const privateKey = new Uint8Array(plain);
    const publicKey = base64ToBytes(vault.publicKey);
    return { publicKey, privateKey };
  } catch {
    throw new Error("Invalid passphrase");
  }
}

export {
  loadVaultFromStorage,
  saveVaultToStorage,
  clearVaultFromStorage,
  vaultExists,
  migrateVaultStorage,
} from "@/lib/vault-storage";
