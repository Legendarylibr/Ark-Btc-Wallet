import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

type NonceGlobal = typeof globalThis & {
  __arkScopedNonces?: Map<string, number>;
  __arkNonceStoreLoaded?: boolean;
};

const g = globalThis as NonceGlobal;

const NONCE_TTL_MS = 10 * 60 * 1000;

interface NonceFile {
  v: 1;
  entries: Record<string, number>;
}

const EMPTY_FILE: NonceFile = { v: 1, entries: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "nonces.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "nonces.json");
}

function loadFile(): NonceFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY_FILE);
}

function persistMap(map: Map<string, number>): void {
  const entries: Record<string, number> = {};
  for (const [key, exp] of map) entries[key] = exp;
  writeEncryptedFile(encPath(), { v: 1, entries });
}

function getMap(): Map<string, number> {
  if (!g.__arkScopedNonces) {
    g.__arkScopedNonces = new Map();
  }
  if (!g.__arkNonceStoreLoaded) {
    g.__arkNonceStoreLoaded = true;
    const file = loadFile();
    const now = Date.now();
    for (const [key, exp] of Object.entries(file.entries)) {
      if (now <= exp) g.__arkScopedNonces.set(key, exp);
    }
  }
  return g.__arkScopedNonces;
}

function prune(): void {
  const map = getMap();
  const now = Date.now();
  let changed = false;
  for (const [key, exp] of map) {
    if (now > exp) {
      map.delete(key);
      changed = true;
    }
  }
  if (changed) persistMap(map);
}

function scopedKey(scope: string, nonce: string): string {
  return `${scope}\0${nonce}`;
}

/**
 * Atomically record a nonce after signature verification.
 * Persists to disk so replay cannot succeed across server restarts.
 */
export function claimNonce(scope: string, nonce: string): boolean {
  prune();
  const map = getMap();
  const key = scopedKey(scope, nonce);
  if (map.has(key)) return false;
  map.set(key, Date.now() + NONCE_TTL_MS);
  persistMap(map);
  return true;
}

/** @deprecated use claimNonce after verify only */
export function markNonceUsed(scope: string, nonce: string): boolean {
  return claimNonce(scope, nonce);
}

export const REGISTER_NONCE_SCOPE = "register";

/** Test-only: clear in-memory cache (disk file unchanged). */
export function resetNonceMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetNonceMemoryCacheForTests is not allowed in production");
  }
  g.__arkScopedNonces = undefined;
  g.__arkNonceStoreLoaded = false;
}
