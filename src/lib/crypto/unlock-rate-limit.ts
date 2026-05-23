import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  retentionMaxUnlockFailures,
  retentionUnlockWindowMs,
} from "@/lib/security/retention-policy";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

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

function pruneEntries(
  entries: UnlockLimitFile["entries"],
  now: number,
): UnlockLimitFile["entries"] {
  const pruned: UnlockLimitFile["entries"] = {};
  for (const [ip, entry] of Object.entries(entries)) {
    if (now <= entry.resetAt) pruned[ip] = entry;
  }
  return pruned;
}

function readUnlockLimitFile(): UnlockLimitFile {
  const now = Date.now();
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries, now);
    if (Object.keys(entries).length === Object.keys(f.entries).length) {
      return f;
    }
    return { v: 1 as const, entries };
  });
}

export function pruneUnlockLimits(): void {
  readUnlockLimitFile();
}

/** Server-side unlock attempt budget per IP (survives process restart). */
export function unlockAttemptAllowed(ip: string): boolean {
  const now = Date.now();
  const file = readUnlockLimitFile();
  const entry = file.entries[ip];
  if (!entry || now > entry.resetAt) return true;
  return entry.count < maxAttempts();
}

export function recordUnlockFailure(ip: string): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries, now);
    const entry = entries[ip];
    if (!entry || now > entry.resetAt) {
      entries[ip] = { count: 1, resetAt: now + windowMs() };
    } else {
      entries[ip] = { count: entry.count + 1, resetAt: entry.resetAt };
    }
    return { v: 1 as const, entries };
  });
}
