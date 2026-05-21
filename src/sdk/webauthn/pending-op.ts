"use client";

export type SdkPendingOpType = "send" | "refresh" | "rotate-address";

export interface SdkPendingOperation {
  walletId: string;
  type: SdkPendingOpType;
  bodyHash: string;
  exp: number;
}

const ops = new Map<string, SdkPendingOperation>();
const TTL_MS = 2 * 60 * 1000;

function prune(): void {
  const now = Date.now();
  for (const [id, op] of ops) {
    if (now > op.exp) ops.delete(id);
  }
}

export function createSdkPendingOp(
  walletId: string,
  type: SdkPendingOpType,
  bodyHash: string,
): string {
  prune();
  const id = crypto.randomUUID();
  ops.set(id, {
    walletId,
    type,
    bodyHash,
    exp: Date.now() + TTL_MS,
  });
  return id;
}

export function consumeSdkPendingOp(
  opId: string,
  walletId: string,
  type: SdkPendingOpType,
  bodyHash: string,
): boolean {
  prune();
  const op = ops.get(opId);
  if (!op || Date.now() > op.exp) return false;
  if (
    op.walletId !== walletId ||
    op.type !== type ||
    op.bodyHash !== bodyHash
  ) {
    return false;
  }
  ops.delete(opId);
  return true;
}
