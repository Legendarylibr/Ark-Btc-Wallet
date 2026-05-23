import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

interface BindingEntry {
  binding: string;
  exp: number;
}

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

function pruneEntries(
  entries: BindingFile["entries"],
  now: number,
): BindingFile["entries"] {
  const pruned: BindingFile["entries"] = {};
  for (const [id, entry] of Object.entries(entries)) {
    if (now <= entry.exp) pruned[id] = entry;
  }
  return pruned;
}

function readBindingFile(): BindingFile {
  const now = Date.now();
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const entries = pruneEntries(f.entries, now);
    if (Object.keys(entries).length === Object.keys(f.entries).length) {
      return f;
    }
    return { v: 1 as const, entries };
  });
}

export function pruneUnlockTokenBindings(): void {
  readBindingFile();
}

export function putUnlockTokenBinding(
  token: string,
  binding: string,
  exp: number,
): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const entries = pruneEntries(f.entries, now);
    entries[token] = { binding, exp };
    return { v: 1 as const, entries };
  });
}

export function getUnlockTokenBinding(token: string): string | undefined {
  const file = readBindingFile();
  const entry = file.entries[token];
  if (!entry || Date.now() > entry.exp) return undefined;
  return entry.binding;
}

export function deleteUnlockTokenBinding(token: string): void {
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const entries = pruneEntries(f.entries, Date.now());
    if (!(token in entries)) return f;
    delete entries[token];
    return { v: 1 as const, entries };
  });
}
