import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { retentionNonceTtlMs } from "@/lib/security/retention-policy";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

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

function pruneEntries(entries: NonceFile["entries"]): NonceFile["entries"] {
  const now = Date.now();
  const pruned: NonceFile["entries"] = {};
  for (const [key, exp] of Object.entries(entries)) {
    if (now <= exp) pruned[key] = exp;
  }
  return pruned;
}

export function pruneNonceStore(): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries);
    if (Object.keys(entries).length === Object.keys(f.entries).length) {
      return f;
    }
    return { v: 1 as const, entries };
  });
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

  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries);
    if (entries[key] != null) {
      return { v: 1 as const, entries };
    }
    entries[key] = Date.now() + nonceTtlMs();
    claimed = true;
    return { v: 1 as const, entries };
  });

  return claimed;
}

/** @deprecated use claimNonce after verify only */
export function markNonceUsed(scope: string, nonce: string): boolean {
  return claimNonce(scope, nonce);
}

export const REGISTER_NONCE_SCOPE = "register";

/** Test-only: no-op (store is disk-authoritative; kept for test API stability). */
export function resetNonceMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetNonceMemoryCacheForTests is not allowed in production");
  }
}
