import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

interface ExpiringFile {
  v: 1;
  entries: Record<string, number>;
}

const EMPTY: ExpiringFile = { v: 1, entries: {} };

function encPath(name: string): string {
  return path.join(getWalletDataDir(), `${name}.enc.json`);
}

function legacyPath(name: string): string {
  return path.join(getWalletDataDir(), `${name}.json`);
}

function pruneEntries(
  entries: Record<string, number>,
  now: number,
): Record<string, number> {
  const pruned: Record<string, number> = {};
  for (const [key, exp] of Object.entries(entries)) {
    if (now <= exp) pruned[key] = exp;
  }
  return pruned;
}

function readStore(storeName: string): ExpiringFile {
  const now = Date.now();
  return mutateEncryptedFile(
    encPath(storeName),
    legacyPath(storeName),
    EMPTY,
    (f) => {
      const entries = pruneEntries(f.entries, now);
      if (Object.keys(entries).length === Object.keys(f.entries).length) {
        return f;
      }
      return { v: 1 as const, entries };
    },
  );
}

/** Set expiring key; returns false if key still active (duplicate). */
export function claimExpiringKey(
  storeName: string,
  key: string,
  ttlMs: number,
): boolean {
  let claimed = false;
  const now = Date.now();
  mutateEncryptedFile(
    encPath(storeName),
    legacyPath(storeName),
    EMPTY,
    (f) => {
      const entries = pruneEntries(f.entries, now);
      const existing = entries[key];
      if (existing != null && now <= existing) {
        return { v: 1 as const, entries };
      }
      entries[key] = now + ttlMs;
      claimed = true;
      return { v: 1 as const, entries };
    },
  );
  return claimed;
}

export function hasExpiringKey(storeName: string, key: string): boolean {
  const now = Date.now();
  const file = readStore(storeName);
  const exp = file.entries[key];
  return exp != null && now <= exp;
}

export function deleteExpiringKey(storeName: string, key: string): void {
  const now = Date.now();
  mutateEncryptedFile(
    encPath(storeName),
    legacyPath(storeName),
    EMPTY,
    (f) => {
      const entries = pruneEntries(f.entries, now);
      if (!(key in entries)) return f;
      delete entries[key];
      return { v: 1 as const, entries };
    },
  );
}

export function clearExpiringStore(storeName: string): void {
  mutateEncryptedFile(
    encPath(storeName),
    legacyPath(storeName),
    EMPTY,
    () => ({ v: 1, entries: {} }),
  );
}

const SCOPED_STORE_NAMES = [
  "wallet-register-challenges",
  "webauthn-challenges",
  "unlock-attempt-tokens",
] as const;

export function pruneAllScopedExpiringStores(): void {
  for (const name of SCOPED_STORE_NAMES) readStore(name);
}
