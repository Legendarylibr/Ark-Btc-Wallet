import { WALLET_LOCK_TIMEOUT_MS } from "@/lib/security/constants-base";

/** Server: aggressive ephemeral TTLs and startup/logout purge. */
export function isZeroRetentionMode(): boolean {
  return (
    process.env.ARK_ZERO_RETENTION === "true" ||
    process.env.ZERO_DATA_RETENTION === "true"
  );
}

export function retentionSessionTtlMs(): number {
  return isZeroRetentionMode() ? 2 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
}

export function retentionSessionIdleMs(): number {
  return isZeroRetentionMode()
    ? WALLET_LOCK_TIMEOUT_MS
    : 30 * 60 * 1000;
}

export function retentionNonceTtlMs(): number {
  return isZeroRetentionMode() ? 3 * 60 * 1000 : 10 * 60 * 1000;
}

export function retentionUnlockWindowMs(): number {
  return isZeroRetentionMode() ? 10 * 60 * 1000 : 15 * 60 * 1000;
}

export function retentionMaxUnlockFailures(): number {
  return isZeroRetentionMode() ? 5 : 8;
}
