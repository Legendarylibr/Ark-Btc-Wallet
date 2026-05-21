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

function encPath(): string {
  return path.join(getWalletDataDir(), "webauthn.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "webauthn.json");
}

function load(): WebAuthnFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY);
}

function save(data: WebAuthnFile): void {
  writeEncryptedFile(encPath(), data);
}

export function getWebAuthnCredential(
  fingerprint: string,
): StoredWebAuthnCredential | null {
  return load().credentials[fingerprint] ?? null;
}

export function hasWebAuthnCredential(fingerprint: string): boolean {
  return getWebAuthnCredential(fingerprint) != null;
}

export function saveWebAuthnCredential(
  fingerprint: string,
  cred: StoredWebAuthnCredential,
): boolean {
  const data = load();
  if (data.credentials[fingerprint]) {
    return false;
  }
  data.credentials[fingerprint] = cred;
  save(data);
  return true;
}

export function updateWebAuthnCounter(
  fingerprint: string,
  counter: number,
): void {
  const data = load();
  const c = data.credentials[fingerprint];
  if (c) {
    c.counter = counter;
    save(data);
  }
}
