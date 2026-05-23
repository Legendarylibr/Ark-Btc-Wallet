import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";
import type { PendingOperation, PendingOpType } from "./pending-op";

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
      optionsIssuedAt?: number;
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

function pruneOps(ops: PendingOpFile["ops"]): PendingOpFile["ops"] {
  const now = Date.now();
  const pruned: PendingOpFile["ops"] = {};
  for (const [id, op] of Object.entries(ops)) {
    if (now <= op.exp) pruned[id] = op;
  }
  return pruned;
}

/** Disk-authoritative read (prunes expired ops under file lock). */
function readPendingOpFile(): PendingOpFile {
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    if (Object.keys(ops).length === Object.keys(f.ops).length) return f;
    return { v: 1 as const, ops };
  });
}

function toPendingOperation(
  op: PendingOpFile["ops"][string],
): PendingOperation | undefined {
  if (!op.creatorPublicKeyB64 || Date.now() > op.exp) return undefined;
  return {
    fingerprint: op.fingerprint,
    type: op.type,
    bodyHash: op.bodyHash,
    creatorPublicKeyB64: op.creatorPublicKeyB64,
    exp: op.exp,
  };
}

export function prunePendingOps(): void {
  readPendingOpFile();
}

export function setPendingOp(id: string, op: PendingOperation): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    ops[id] = op;
    return { v: 1 as const, ops };
  });
}

export function getPendingOp(id: string): PendingOperation | undefined {
  const file = readPendingOpFile();
  const op = file.ops[id];
  if (!op) return undefined;
  return toPendingOperation(op);
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
  return deleted;
}

/** Atomically match pending op fields and delete (single-use). */
export function atomicConsumePendingOp(
  id: string,
  fingerprint: string,
  type: PendingOpType,
  bodyHash: string,
): boolean {
  let consumed = false;
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    const op = ops[id];
    if (
      !op ||
      op.fingerprint !== fingerprint ||
      op.type !== type ||
      op.bodyHash !== bodyHash
    ) {
      return { v: 1 as const, ops };
    }
    delete ops[id];
    consumed = true;
    return { v: 1 as const, ops };
  });
  return consumed;
}

const AUTH_OPTIONS_COOLDOWN_MS = 60_000;

/** Issue WebAuthn auth-options at most once per minute per pending op. */
export function atomicClaimPendingOpAuthOptions(
  id: string,
  fingerprint: string,
): boolean {
  let claimed = false;
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const ops = pruneOps(f.ops);
    const op = ops[id];
    if (!op || op.fingerprint !== fingerprint) {
      return { v: 1 as const, ops };
    }
    if (
      op.optionsIssuedAt != null &&
      now - op.optionsIssuedAt < AUTH_OPTIONS_COOLDOWN_MS
    ) {
      return { v: 1 as const, ops };
    }
    ops[id] = { ...op, optionsIssuedAt: now };
    claimed = true;
    return { v: 1 as const, ops };
  });
  return claimed;
}

/** Test-only: no-op (store is disk-authoritative; kept for test API stability). */
export function resetPendingOpMemoryCacheForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("resetPendingOpMemoryCacheForTests is not allowed in production");
  }
}
