import { HARDWARE_REQUIRED_PATHS } from "./constants";

export type PendingOpType =
  | "send"
  | "refresh"
  | "rotate-address"
  | "session-register"
  | "read-access";

export const VALID_PENDING_OP_TYPES: readonly PendingOpType[] = [
  "send",
  "refresh",
  "rotate-address",
  "session-register",
  "read-access",
];

const VALID_TYPES = new Set<string>(VALID_PENDING_OP_TYPES);

export function parsePendingOpType(type: string): PendingOpType | null {
  return VALID_TYPES.has(type) ? (type as PendingOpType) : null;
}

const READ_PROTECTED_PATHS = new Set([
  "/api/wallet/balance",
  "/api/wallet/history",
  "/api/wallet/address",
]);

/** POST routes gated like reads (no balance in response). */
const READ_CRYPTO_POST_PATHS = new Set(["/api/wallet/sync"]);

export function isReadProtectedPath(pathname: string): boolean {
  return READ_PROTECTED_PATHS.has(pathname);
}

export function isReadCryptoPostPath(pathname: string): boolean {
  return READ_CRYPTO_POST_PATHS.has(pathname);
}

/** Maps wallet API paths to pending-op types (must match HARDWARE_REQUIRED_PATHS). */
export function pendingOpTypeForPath(
  pathname: string,
  search = "",
): PendingOpType | null {
  if (
    pathname.endsWith("/send/estimate") &&
    HARDWARE_REQUIRED_PATHS.has("/api/wallet/send/estimate")
  ) {
    return "send";
  }
  if (pathname.endsWith("/send") && HARDWARE_REQUIRED_PATHS.has("/api/wallet/send")) {
    return "send";
  }
  if (
    pathname.endsWith("/refresh") &&
    HARDWARE_REQUIRED_PATHS.has("/api/wallet/refresh")
  ) {
    return "refresh";
  }
  if (
    pathname.includes("/address") &&
    search.includes("rotate=1") &&
    HARDWARE_REQUIRED_PATHS.has("/api/wallet/address")
  ) {
    return "rotate-address";
  }
  return null;
}
