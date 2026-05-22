import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

type StoreGlobal = typeof globalThis & {
  __arkPersistedStores?: Map<string, Map<string, number>>;
  __arkPersistedLoaded?: Set<string>;
};

const g = globalThis as StoreGlobal;

interface ExpiringFile {
  v: 1;
  entries: Record<string, number>;
}

const EMPTY: ExpiringFile = { v: 1, entries: {} };

function storeMap(name: string): Map<string, number> {
  if (!g.__arkPersistedStores) g.__arkPersistedStores = new Map();
  let map = g.__arkPersistedStores.get(name);
  if (!map) {
    map = new Map();
    g.__arkPersistedStores.set(name, map);
  }
  return map;
}

function encPath(name: string): string {
  return path.join(getWalletDataDir(), `${name}.enc.json`);
}

function legacyPath(name: string): string {
  return path.join(getWalletDataDir(), `${name}.json`);
}

function load(name: string): void {
  if (!g.__arkPersistedLoaded) g.__arkPersistedLoaded = new Set();
  if (g.__arkPersistedLoaded.has(name)) return;
  g.__arkPersistedLoaded.add(name);

  const file = readEncryptedFile(encPath(name), legacyPath(name), EMPTY);
  const map = storeMap(name);
  const now = Date.now();
  for (const [key, exp] of Object.entries(file.entries)) {
    if (now <= exp) map.set(key, exp);
  }
}

function persist(name: string): void {
  const map = storeMap(name);
  const entries: Record<string, number> = {};
  for (const [key, exp] of map) entries[key] = exp;
  writeEncryptedFile(encPath(name), { v: 1, entries });
}

function prune(name: string): void {
  load(name);
  const map = storeMap(name);
  const now = Date.now();
  let changed = false;
  for (const [key, exp] of map) {
    if (now > exp) {
      map.delete(key);
      changed = true;
    }
  }
  if (changed) persist(name);
}

/** Set expiring key; returns false if key still active (duplicate). */
export function claimExpiringKey(
  storeName: string,
  key: string,
  ttlMs: number,
): boolean {
  prune(storeName);
  const map = storeMap(storeName);
  const now = Date.now();
  const existing = map.get(key);
  if (existing != null && now <= existing) return false;
  map.set(key, now + ttlMs);
  persist(storeName);
  return true;
}

export function hasExpiringKey(storeName: string, key: string): boolean {
  prune(storeName);
  const exp = storeMap(storeName).get(key);
  return exp != null && Date.now() <= exp;
}

export function deleteExpiringKey(storeName: string, key: string): void {
  load(storeName);
  const map = storeMap(storeName);
  if (map.delete(key)) persist(storeName);
}

export function clearExpiringStore(storeName: string): void {
  storeMap(storeName).clear();
  persist(storeName);
}

const SCOPED_STORE_NAMES = [
  "wallet-register-challenges",
  "webauthn-challenges",
  "unlock-attempt-tokens",
] as const;

export function pruneAllScopedExpiringStores(): void {
  for (const name of SCOPED_STORE_NAMES) prune(name);
}
