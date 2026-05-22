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

const READ_PROTECTED_PATHS = new Set([
  "/api/wallet/balance",
  "/api/wallet/history",
  "/api/wallet/address",
]);

export function isReadProtectedPath(pathname: string): boolean {
  return READ_PROTECTED_PATHS.has(pathname);
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
