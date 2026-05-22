export {
  WALLET_LOCK_TIMEOUT_MS,
  READ_HARDWARE_TTL_MS,
  MAX_API_BODY_BYTES,
  MIN_SESSION_SECRET_LENGTH,
  MAX_CLOCK_SKEW_MS,
} from "@/lib/security/constants-base";

import {
  retentionSessionIdleMs,
  retentionSessionTtlMs,
} from "@/lib/security/retention-policy";

/** Evaluated at process start from env (see ARK_ZERO_RETENTION). */
export const SERVER_SESSION_IDLE_MS = retentionSessionIdleMs();
export const SERVER_SESSION_TTL_MS = retentionSessionTtlMs();
