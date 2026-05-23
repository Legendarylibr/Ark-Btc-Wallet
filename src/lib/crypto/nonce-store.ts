import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { retentionNonceTtlMs } from "@/lib/security/retention-policy";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

type NonceGlobal = typeof globalThis & {
  __arkScopedNonces?: Map<string, number>;
  __arkNonceStoreLoaded?: boolean;
};

const g = globalThis as NonceGlobal;

function nonceTtlMs(): number {
  return retentionNonceTtlMs();
}

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

function syncCacheFromFile(file: NonceFile): void {
  if (!g.__arkScopedNonces) g.__arkScopedNonces = new Map();
  g.__arkScopedNonces.clear();
  const now = Date.now();
  for (const [key, exp] of Object.entries(file.entries)) {
    if (now <= exp) g.__arkScopedNonces.set(key, exp);
  }
  g.__arkNonceStoreLoaded = true;
}

function getMap(): Map<string, number> {
  if (!g.__arkScopedNonces) g.__arkScopedNonces = new Map();
  if (!g.__arkNonceStoreLoaded) {
    const file = mutateEncryptedFile(
      encPath(),
      legacyPath(),
      EMPTY_FILE,
      (f) => f,
    );
    syncCacheFromFile(file);
  }
  return g.__arkScopedNonces;
}

function pruneEntries(entries: NonceFile["entries"]): NonceFile["entries"] {
  const now = Date.now();
  const pruned: NonceFile["entries"] = {};
  for (const [key, exp] of Object.entries(entries)) {
    if (now <= exp) pruned[key] = exp;
  }
  return pruned;
}

export function pruneNonceStore(): void {
  const file = mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries);
    if (Object.keys(entries).length === Object.keys(f.entries).length) {
      return f;
    }
    return { v: 1 as const, entries };
  });
  syncCacheFromFile(file);
}

function scopedKey(scope: string, nonce: string): string {
  return `${scope}\0${nonce}`;
}

/**
 * Atomically record a nonce after signature verification.
 * Persists to disk so replay cannot succeed across server restarts.
 */
export function claimNonce(scope: string, nonce: string): boolean {
  const key = scopedKey(scope, nonce);
  let claimed = false;

  const file = mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries);
    if (entries[key] != null) {
      return { v: 1 as const, entries };
    }
    entries[key] = Date.now() + nonceTtlMs();
    claimed = true;
    return { v: 1 as const, entries };
  });

  syncCacheFromFile(file);
  return claimed;
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
