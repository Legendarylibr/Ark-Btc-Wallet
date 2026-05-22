/** Client idle auto-lock (barkd + SDK browser wallet) */
export const WALLET_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/** Balance/history reads allowed after recent WebAuthn (matches auto-lock window) */
export const READ_HARDWARE_TTL_MS = WALLET_LOCK_TIMEOUT_MS;

/** Max JSON / signed request body */
export const MAX_API_BODY_BYTES = 64 * 1024;

/** Production SESSION_SECRET minimum */
export const MIN_SESSION_SECRET_LENGTH = 32;

/** Ed25519 request clock skew */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
