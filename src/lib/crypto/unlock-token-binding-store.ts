import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

interface BindingEntry {
  binding: string;
  exp: number;
}

type BindingGlobal = typeof globalThis & {
  __arkUnlockBindings?: Map<string, BindingEntry>;
  __arkUnlockBindingsLoaded?: boolean;
};

const g = globalThis as BindingGlobal;

interface BindingFile {
  v: 1;
  entries: Record<string, BindingEntry>;
}

const EMPTY: BindingFile = { v: 1, entries: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "unlock-token-bindings.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "unlock-token-bindings.json");
}

function getMap(): Map<string, BindingEntry> {
  if (!g.__arkUnlockBindings) g.__arkUnlockBindings = new Map();
  if (!g.__arkUnlockBindingsLoaded) {
    g.__arkUnlockBindingsLoaded = true;
    const file = readEncryptedFile(encPath(), legacyPath(), EMPTY);
    const now = Date.now();
    for (const [id, entry] of Object.entries(file.entries)) {
      if (now <= entry.exp) g.__arkUnlockBindings.set(id, entry);
    }
  }
  return g.__arkUnlockBindings;
}

function persist(): void {
  const entries: BindingFile["entries"] = {};
  for (const [id, entry] of getMap()) entries[id] = entry;
  writeEncryptedFile(encPath(), { v: 1, entries });
}

function prune(): void {
  const map = getMap();
  const now = Date.now();
  let changed = false;
  for (const [id, entry] of map) {
    if (now > entry.exp) {
      map.delete(id);
      changed = true;
    }
  }
  if (changed) persist();
}

export function putUnlockTokenBinding(
  token: string,
  binding: string,
  exp: number,
): void {
  prune();
  getMap().set(token, { binding, exp });
  persist();
}

export function getUnlockTokenBinding(token: string): string | undefined {
  prune();
  const entry = getMap().get(token);
  if (!entry || Date.now() > entry.exp) return undefined;
  return entry.binding;
}

export function deleteUnlockTokenBinding(token: string): void {
  if (getMap().delete(token)) persist();
}
