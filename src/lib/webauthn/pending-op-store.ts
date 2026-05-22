import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";
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

function getMap(): Map<string, PendingOperation> {
  if (!g.__arkPendingOps) g.__arkPendingOps = new Map();
  if (!g.__arkPendingOpsLoaded) {
    g.__arkPendingOpsLoaded = true;
    const file = readEncryptedFile(encPath(), legacyPath(), EMPTY);
    const now = Date.now();
    for (const [id, op] of Object.entries(file.ops)) {
      if (now <= op.exp) {
        g.__arkPendingOps.set(id, op);
      }
    }
  }
  return g.__arkPendingOps;
}

function persist(): void {
  const ops: PendingOpFile["ops"] = {};
  for (const [id, op] of getMap()) {
    ops[id] = op;
  }
  writeEncryptedFile(encPath(), { v: 1, ops });
}

export function prunePendingOps(): void {
  const map = getMap();
  const now = Date.now();
  let changed = false;
  for (const [id, op] of map) {
    if (now > op.exp) {
      map.delete(id);
      changed = true;
    }
  }
  if (changed) persist();
}

export function setPendingOp(id: string, op: PendingOperation): void {
  getMap().set(id, op);
  persist();
}

export function getPendingOp(id: string): PendingOperation | undefined {
  prunePendingOps();
  return getMap().get(id);
}

export function deletePendingOp(id: string): boolean {
  const deleted = getMap().delete(id);
  if (deleted) persist();
  return deleted;
}
