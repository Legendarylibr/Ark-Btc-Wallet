import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

type UnlockGlobal = typeof globalThis & {
  __arkUnlockLimits?: Map<string, { count: number; resetAt: number }>;
  __arkUnlockLimitsLoaded?: boolean;
};

const g = globalThis as UnlockGlobal;

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

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

function prune(): void {
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
  prune();
  const now = Date.now();
  const entry = getMap().get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < MAX_ATTEMPTS;
}

export function recordUnlockFailure(ip: string): void {
  prune();
  const now = Date.now();
  const map = getMap();
  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
  persistMap(map);
}
