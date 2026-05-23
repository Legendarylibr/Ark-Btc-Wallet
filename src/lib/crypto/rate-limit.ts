import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

interface RateLimitFile {
  v: 1;
  entries: Record<string, { count: number; resetAt: number }>;
}

const EMPTY: RateLimitFile = { v: 1, entries: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "rate-limits.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "rate-limits.json");
}

function pruneEntries(
  entries: RateLimitFile["entries"],
  now: number,
): RateLimitFile["entries"] {
  const pruned: RateLimitFile["entries"] = {};
  for (const [key, entry] of Object.entries(entries)) {
    if (now <= entry.resetAt) pruned[key] = entry;
  }
  return pruned;
}

function readRateLimitFile(): RateLimitFile {
  const now = Date.now();
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const entries = pruneEntries(f.entries, now);
    if (Object.keys(entries).length === Object.keys(f.entries).length) {
      return f;
    }
    return { v: 1 as const, entries };
  });
}

export function pruneRateLimitStore(): void {
  readRateLimitFile();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  let allowed = false;
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const entries = pruneEntries(f.entries, now);
    const entry = entries[key];
    if (!entry || now > entry.resetAt) {
      entries[key] = { count: 1, resetAt: now + windowMs };
      allowed = true;
      return { v: 1 as const, entries };
    }
    if (entry.count >= limit) {
      allowed = false;
      return { v: 1 as const, entries };
    }
    entries[key] = { count: entry.count + 1, resetAt: entry.resetAt };
    allowed = true;
    return { v: 1 as const, entries };
  });
  return allowed;
}

/** Only trust X-Forwarded-For when TRUST_PROXY=true (behind a real reverse proxy). */
export function clientIp(request: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() ?? "unknown";
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  return "local";
}
