import {
  atomicConsumePendingOp,
  deletePendingOp,
  getPendingOp,
  prunePendingOps,
  setPendingOp,
} from "./pending-op-store";

export type { PendingOpType } from "./pending-op-paths";
export {
  isReadProtectedPath,
  pendingOpTypeForPath,
  VALID_PENDING_OP_TYPES,
} from "./pending-op-paths";

import type { PendingOpType } from "./pending-op-paths";

export interface PendingOperation {
  fingerprint: string;
  type: PendingOpType;
  bodyHash: string;
  /** Ed25519 public key (base64) that created this op — required for auth-options. */
  creatorPublicKeyB64: string;
  exp: number;
}

const TTL_MS = 2 * 60 * 1000;

export function createPendingOp(
  fingerprint: string,
  type: PendingOpType,
  bodyHash: string,
  creatorPublicKeyB64: string,
): string {
  prunePendingOps();
  const id = crypto.randomUUID();
  setPendingOp(id, {
    fingerprint,
    type,
    bodyHash,
    creatorPublicKeyB64,
    exp: Date.now() + TTL_MS,
  });
  return id;
}

export function getPendingOpDetails(
  opId: string,
): PendingOperation | null {
  const op = getPendingOp(opId);
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
  return atomicConsumePendingOp(opId, fingerprint, type, bodyHash);
}

export function invalidatePendingOp(opId: string): void {
  prunePendingOps();
  deletePendingOp(opId);
}
