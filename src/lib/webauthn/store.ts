import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  mutateEncryptedFile,
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

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

type WebAuthnGlobal = typeof globalThis & {
  __arkWebAuthn?: Map<string, StoredWebAuthnCredential>;
  __arkWebAuthnLoaded?: boolean;
};

const g = globalThis as WebAuthnGlobal;

function encPath(): string {
  return path.join(getWalletDataDir(), "webauthn.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "webauthn.json");
}

function loadFile(): WebAuthnFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY);
}

function writeFile(data: WebAuthnFile): void {
  writeEncryptedFile(encPath(), data);
}

function getMap(): Map<string, StoredWebAuthnCredential> {
  if (!g.__arkWebAuthn) g.__arkWebAuthn = new Map();
  if (!g.__arkWebAuthnLoaded) {
    g.__arkWebAuthnLoaded = true;
    const file = loadFile();
    for (const [fp, cred] of Object.entries(file.credentials)) {
      g.__arkWebAuthn.set(fp, { ...cred });
    }
  }
  return g.__arkWebAuthn;
}

function persist(): void {
  const credentials: WebAuthnFile["credentials"] = {};
  for (const [fp, cred] of getMap()) credentials[fp] = cred;
  writeFile({ v: 1, credentials });
}

function setCached(fingerprint: string, cred: StoredWebAuthnCredential): void {
  getMap().set(fingerprint, { ...cred });
}

/** Reload one credential from disk into cache (multi-worker counter sync). */
export function syncWebAuthnCredentialFromDisk(
  fingerprint: string,
): StoredWebAuthnCredential | null {
  const file = loadFile();
  const cred = file.credentials[fingerprint];
  if (!cred) return null;
  setCached(fingerprint, cred);
  return { ...cred };
}

export function getWebAuthnCredential(
  fingerprint: string,
): StoredWebAuthnCredential | null {
  return getMap().get(fingerprint) ?? null;
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
  if (saved) setCached(fingerprint, cred);
  return saved;
}

/** Monotonic counter update under file lock — safe across workers. */
export function updateWebAuthnCounter(
  fingerprint: string,
  counter: number,
): void {
  let updated: StoredWebAuthnCredential | null = null;
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (file) => {
    const c = file.credentials[fingerprint];
    if (c && counter > c.counter) {
      c.counter = counter;
      updated = { ...c };
    }
    return file;
  });
  if (updated) setCached(fingerprint, updated);
}

/** Test-only: clear in-memory cache (disk file unchanged). */
export function resetWebAuthnMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetWebAuthnMemoryCacheForTests is not allowed in production");
  }
  g.__arkWebAuthn = undefined;
  g.__arkWebAuthnLoaded = false;
}
