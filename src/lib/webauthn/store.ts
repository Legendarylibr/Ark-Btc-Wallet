import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
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
      g.__arkWebAuthn.set(fp, cred);
    }
  }
  return g.__arkWebAuthn;
}

function persist(): void {
  const credentials: WebAuthnFile["credentials"] = {};
  for (const [fp, cred] of getMap()) credentials[fp] = cred;
  writeFile({ v: 1, credentials });
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
  const map = getMap();
  if (map.has(fingerprint)) {
    return false;
  }
  map.set(fingerprint, cred);
  persist();
  return true;
}

/** Monotonic counter update — only advances, never regresses (clone/replay mitigation). */
export function updateWebAuthnCounter(
  fingerprint: string,
  counter: number,
): void {
  const map = getMap();
  const c = map.get(fingerprint);
  if (c && counter > c.counter) {
    c.counter = counter;
    persist();
  }
}
