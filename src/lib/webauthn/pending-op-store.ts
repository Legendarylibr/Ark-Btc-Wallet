import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";
import type { PendingOperation, PendingOpType } from "./pending-op";

type PendingGlobal = typeof globalThis & {
  __arkPendingOps?: Map<string, PendingOperation>;
  __arkPendingOpsLoaded?: boolean;
};

const g = globalThis as PendingGlobal;

interface PendingOpFile {
  v: 1;
  ops: Record<
    string,
    {
      fingerprint: string;
      type: PendingOpType;
      bodyHash: string;
      creatorPublicKeyB64?: string;
      exp: number;
    }
  >;
}

const EMPTY: PendingOpFile = { v: 1, ops: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "pending-ops.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "pending-ops.json");
}

function syncCacheFromFile(file: PendingOpFile): void {
  if (!g.__arkPendingOps) g.__arkPendingOps = new Map();
  g.__arkPendingOps.clear();
  const now = Date.now();
  for (const [id, op] of Object.entries(file.ops)) {
    if (now <= op.exp && op.creatorPublicKeyB64) {
      g.__arkPendingOps.set(id, {
        fingerprint: op.fingerprint,
        type: op.type,
        bodyHash: op.bodyHash,
        creatorPublicKeyB64: op.creatorPublicKeyB64,
        exp: op.exp,
      });
    }
  }
  g.__arkPendingOpsLoaded = true;
}

function getMap(): Map<string, PendingOperation> {
  if (!g.__arkPendingOps) g.__arkPendingOps = new Map();
  if (!g.__arkPendingOpsLoaded) {
    const file = mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => f);
    syncCacheFromFile(file);
  }
  return g.__arkPendingOps;
}

function pruneOps(ops: PendingOpFile["ops"]): PendingOpFile["ops"] {
  const now = Date.now();
  const pruned: PendingOpFile["ops"] = {};
  for (const [id, op] of Object.entries(ops)) {
    if (now <= op.exp) pruned[id] = op;
  }
  return pruned;
}

export function prunePendingOps(): void {
  const file = mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    if (Object.keys(ops).length === Object.keys(f.ops).length) return f;
    return { v: 1 as const, ops };
  });
  syncCacheFromFile(file);
}

export function setPendingOp(id: string, op: PendingOperation): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    ops[id] = op;
    return { v: 1 as const, ops };
  });
  getMap().set(id, op);
}

export function getPendingOp(id: string): PendingOperation | undefined {
  prunePendingOps();
  return getMap().get(id);
}

export function deletePendingOp(id: string): boolean {
  let deleted = false;
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    if (!(id in ops)) return f;
    delete ops[id];
    deleted = true;
    return { v: 1 as const, ops };
  });
  if (deleted) getMap().delete(id);
  return deleted;
}

/** Test-only: clear in-memory cache (disk file unchanged). */
export function resetPendingOpMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetPendingOpMemoryCacheForTests is not allowed in production");
  }
  g.__arkPendingOps = undefined;
  g.__arkPendingOpsLoaded = false;
}
