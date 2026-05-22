import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  retentionMaxUnlockFailures,
  retentionUnlockWindowMs,
} from "@/lib/security/retention-policy";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

type UnlockGlobal = typeof globalThis & {
  __arkUnlockLimits?: Map<string, { count: number; resetAt: number }>;
  __arkUnlockLimitsLoaded?: boolean;
};

const g = globalThis as UnlockGlobal;

function maxAttempts(): number {
  return retentionMaxUnlockFailures();
}

function windowMs(): number {
  return retentionUnlockWindowMs();
}

interface UnlockLimitFile {
  v: 1;
  entries: Record<string, { count: number; resetAt: number }>;
}

const EMPTY_FILE: UnlockLimitFile = { v: 1, entries: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "unlock-limits.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "unlock-limits.json");
}

function loadFile(): UnlockLimitFile {
  return readEncryptedFile(encPath(), legacyPath(), EMPTY_FILE);
}

function persistMap(map: Map<string, { count: number; resetAt: number }>): void {
  const entries: Record<string, { count: number; resetAt: number }> = {};
  for (const [ip, v] of map) entries[ip] = v;
  writeEncryptedFile(encPath(), { v: 1, entries });
}

function getMap(): Map<string, { count: number; resetAt: number }> {
  if (!g.__arkUnlockLimits) {
    g.__arkUnlockLimits = new Map();
  }
  if (!g.__arkUnlockLimitsLoaded) {
    g.__arkUnlockLimitsLoaded = true;
    const file = loadFile();
    const now = Date.now();
    for (const [ip, entry] of Object.entries(file.entries)) {
      if (now <= entry.resetAt) g.__arkUnlockLimits.set(ip, entry);
    }
  }
  return g.__arkUnlockLimits;
}

export function pruneUnlockLimits(): void {
  const map = getMap();
  const now = Date.now();
  let changed = false;
  for (const [ip, entry] of map) {
    if (now > entry.resetAt) {
      map.delete(ip);
      changed = true;
    }
  }
  if (changed) persistMap(map);
}

/** Server-side unlock attempt budget per IP (survives process restart). */
export function unlockAttemptAllowed(ip: string): boolean {
  pruneUnlockLimits();
  const now = Date.now();
  const entry = getMap().get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < maxAttempts();
}

export function recordUnlockFailure(ip: string): void {
  pruneUnlockLimits();
  const now = Date.now();
  const map = getMap();
  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs() });
  } else {
    entry.count += 1;
  }
  persistMap(map);
}
