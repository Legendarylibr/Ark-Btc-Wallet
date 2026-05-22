import { HARDWARE_REQUIRED_PATHS } from "./constants";

export type PendingOpType =
  | "send"
  | "refresh"
  | "rotate-address"
  | "session-register";

export interface PendingOperation {
  fingerprint: string;
  type: PendingOpType;
  bodyHash: string;
  exp: number;
}

type PendingGlobal = typeof globalThis & {
  __arkPendingOps?: Map<string, PendingOperation>;
};

const g = globalThis as PendingGlobal;
const ops = g.__arkPendingOps ??= new Map();

const TTL_MS = 2 * 60 * 1000;

function prune(): void {
  const now = Date.now();
  for (const [id, op] of ops) {
    if (now > op.exp) ops.delete(id);
  }
}

export function createPendingOp(
  fingerprint: string,
  type: PendingOpType,
  bodyHash: string,
): string {
  prune();
  const id = crypto.randomUUID();
  ops.set(id, {
    fingerprint,
    type,
    bodyHash,
    exp: Date.now() + TTL_MS,
  });
  return id;
}

export function getPendingOpDetails(
  opId: string,
): PendingOperation | null {
  prune();
  const op = ops.get(opId);
  if (!op || Date.now() > op.exp) return null;
  return op;
}

export function hasPendingOp(opId: string, fingerprint: string): boolean {
  const op = getPendingOpDetails(opId);
  return op != null && op.fingerprint === fingerprint;
}

export function matchesPendingOp(
  opId: string,
  fingerprint: string,
  type: PendingOpType,
  bodyHash: string,
): boolean {
  const op = getPendingOpDetails(opId);
  if (!op || op.fingerprint !== fingerprint) return false;
  return op.type === type && op.bodyHash === bodyHash;
}

export function consumePendingOp(
  opId: string,
  fingerprint: string,
  type: PendingOpType,
  bodyHash: string,
): boolean {
  if (!matchesPendingOp(opId, fingerprint, type, bodyHash)) return false;
  ops.delete(opId);
  return true;
}

/** Drop a pending op after failed verification so attackers cannot burn the slot. */
export function invalidatePendingOp(opId: string): void {
  prune();
  ops.delete(opId);
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

export const VALID_PENDING_OP_TYPES: readonly PendingOpType[] = [
  "send",
  "refresh",
  "rotate-address",
  "session-register",
];
