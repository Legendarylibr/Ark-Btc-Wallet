/** Client idle auto-lock (barkd + SDK browser wallet) */
export const WALLET_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/** Server session absolute lifetime */
export const SERVER_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Server session idle timeout (no signed API use) */
export const SERVER_SESSION_IDLE_MS = 30 * 60 * 1000;

/** Max JSON / signed request body */
export const MAX_API_BODY_BYTES = 64 * 1024;

/** Production SESSION_SECRET minimum */
export const MIN_SESSION_SECRET_LENGTH = 32;

/** Ed25519 request clock skew */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
