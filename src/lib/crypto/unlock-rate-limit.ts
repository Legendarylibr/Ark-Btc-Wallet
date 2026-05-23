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

interface UnlockLimitEntry {
  failures: number;
  tokensIssued: number;
  resetAt: number;
}

interface UnlockLimitFile {
  v: 1;
  entries: Record<string, UnlockLimitEntry>;
}

const EMPTY_FILE: UnlockLimitFile = { v: 1, entries: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "unlock-limits.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "unlock-limits.json");
}

function normalizeEntry(
  raw: UnlockLimitEntry | { count: number; resetAt: number },
): UnlockLimitEntry {
  if ("failures" in raw) return raw;
  return { failures: raw.count, tokensIssued: 0, resetAt: raw.resetAt };
}

function pruneEntries(
  entries: UnlockLimitFile["entries"],
  now: number,
): UnlockLimitFile["entries"] {
  const pruned: UnlockLimitFile["entries"] = {};
  for (const [ip, entry] of Object.entries(entries)) {
    const normalized = normalizeEntry(entry);
    if (now <= normalized.resetAt) pruned[ip] = normalized;
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
  return entry.failures < maxAttempts();
}

/**
 * Atomically reserve an unlock-check token slot (parallel-safe).
 * Caps token issuance to the same budget as unlock failures per window.
 */
export function claimUnlockCheckSlot(ip: string): boolean {
  let allowed = false;
  const now = Date.now();
  const max = maxAttempts();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries, now);
    const entry = entries[ip];
    if (!entry || now > entry.resetAt) {
      entries[ip] = { failures: 0, tokensIssued: 1, resetAt: now + windowMs() };
      allowed = true;
      return { v: 1 as const, entries };
    }
    if (entry.failures >= max || entry.tokensIssued >= max) {
      allowed = false;
      return { v: 1 as const, entries };
    }
    entries[ip] = {
      failures: entry.failures,
      tokensIssued: entry.tokensIssued + 1,
      resetAt: entry.resetAt,
    };
    allowed = true;
    return { v: 1 as const, entries };
  });
  return allowed;
}

export function recordUnlockFailure(ip: string): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY_FILE, (f) => {
    const entries = pruneEntries(f.entries, now);
    const entry = entries[ip];
    if (!entry || now > entry.resetAt) {
      entries[ip] = { failures: 1, tokensIssued: 0, resetAt: now + windowMs() };
    } else {
      entries[ip] = {
        failures: entry.failures + 1,
        tokensIssued: entry.tokensIssued,
        resetAt: entry.resetAt,
      };
    }
    return { v: 1 as const, entries };
  });
}
