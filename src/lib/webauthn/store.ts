import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

export interface StoredWebAuthnCredential {
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  registeredAt: number;
}

interface WebAuthnFile {
  v: 1;
  credentials: Record<string, StoredWebAuthnCredential>;
}

const EMPTY: WebAuthnFile = { v: 1, credentials: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "webauthn.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "webauthn.json");
}

function readWebAuthnFile(): WebAuthnFile {
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => f);
}

/** Disk-authoritative credential read (multi-worker safe). */
export function syncWebAuthnCredentialFromDisk(
  fingerprint: string,
): StoredWebAuthnCredential | null {
  const cred = readWebAuthnFile().credentials[fingerprint];
  return cred ? { ...cred } : null;
}

export function getWebAuthnCredential(
  fingerprint: string,
): StoredWebAuthnCredential | null {
  return syncWebAuthnCredentialFromDisk(fingerprint);
}

export function hasWebAuthnCredential(fingerprint: string): boolean {
  return getWebAuthnCredential(fingerprint) != null;
}

export function saveWebAuthnCredential(
  fingerprint: string,
  cred: StoredWebAuthnCredential,
): boolean {
  let saved = false;
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (file) => {
    if (file.credentials[fingerprint]) return file;
    file.credentials[fingerprint] = cred;
    saved = true;
    return file;
  });
  return saved;
}

/** Monotonic counter update under file lock — safe across workers. */
export function updateWebAuthnCounter(
  fingerprint: string,
  counter: number,
): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (file) => {
    const c = file.credentials[fingerprint];
    if (c && counter > c.counter) {
      c.counter = counter;
    }
    return file;
  });
}

/** Test-only: no-op (store is disk-authoritative; kept for test API stability). */
export function resetWebAuthnMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetWebAuthnMemoryCacheForTests is not allowed in production");
  }
}
