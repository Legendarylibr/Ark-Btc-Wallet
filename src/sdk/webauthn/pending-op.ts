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
const STORAGE_KEY = "sdk-pending-ops";

let sessionHydrated = false;

function prune(): void {
  const now = Date.now();
  for (const [id, op] of ops) {
    if (now > op.exp) ops.delete(id);
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const entries: Record<string, SdkPendingOperation> = {};
    for (const [id, op] of ops) entries[id] = op;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota / private mode */
  }
}

function loadFromSession(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Record<string, SdkPendingOperation>;
    const now = Date.now();
    for (const [id, op] of Object.entries(entries)) {
      if (now <= op.exp) ops.set(id, op);
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

function ensureSessionHydrated(): void {
  if (sessionHydrated || typeof window === "undefined") return;
  sessionHydrated = true;
  loadFromSession();
}

export function clearSdkPendingOpsStorage(): void {
  ops.clear();
  sessionHydrated = false;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function createSdkPendingOp(
  walletId: string,
  type: SdkPendingOpType,
  bodyHash: string,
): string {
  ensureSessionHydrated();
  prune();
  const id = crypto.randomUUID();
  ops.set(id, {
    walletId,
    type,
    bodyHash,
    exp: Date.now() + TTL_MS,
  });
  persist();
  return id;
}

export function consumeSdkPendingOp(
  opId: string,
  walletId: string,
  type: SdkPendingOpType,
  bodyHash: string,
): boolean {
  ensureSessionHydrated();
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
  persist();
  return true;
}
