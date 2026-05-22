import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

type BucketGlobal = typeof globalThis & {
  __arkRateLimits?: Map<string, { count: number; resetAt: number }>;
  __arkRateLimitsLoaded?: boolean;
};

const g = globalThis as BucketGlobal;

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

function getBuckets(): Map<string, { count: number; resetAt: number }> {
  if (!g.__arkRateLimits) g.__arkRateLimits = new Map();
  if (!g.__arkRateLimitsLoaded) {
    g.__arkRateLimitsLoaded = true;
    const file = readEncryptedFile(encPath(), legacyPath(), EMPTY);
    const now = Date.now();
    for (const [key, entry] of Object.entries(file.entries)) {
      if (now <= entry.resetAt) g.__arkRateLimits.set(key, entry);
    }
  }
  return g.__arkRateLimits;
}

function persist(): void {
  const entries: RateLimitFile["entries"] = {};
  for (const [key, entry] of getBuckets()) entries[key] = entry;
  writeEncryptedFile(encPath(), { v: 1, entries });
}

export function pruneRateLimitStore(): void {
  const buckets = getBuckets();
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) {
      buckets.delete(key);
      changed = true;
    }
  }
  if (changed) persist();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  pruneRateLimitStore();
  const now = Date.now();
  const buckets = getBuckets();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    persist();
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  persist();
  return true;
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
