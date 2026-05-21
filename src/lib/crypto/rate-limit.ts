type BucketGlobal = typeof globalThis & {
  __arkRateLimits?: Map<string, { count: number; resetAt: number }>;
};

const g = globalThis as BucketGlobal;
const buckets = g.__arkRateLimits ??= new Map();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
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
