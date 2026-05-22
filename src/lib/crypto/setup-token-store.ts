import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import {
  readEncryptedFile,
  writeEncryptedFile,
} from "@/lib/encrypted-file";

export interface StoredSetupToken {
  publicKeyB64: string;
  fingerprint: string;
  exp: number;
}

type SetupGlobal = typeof globalThis & {
  __arkSetupTokens?: Map<string, StoredSetupToken>;
  __arkSetupTokensLoaded?: boolean;
};

const g = globalThis as SetupGlobal;

interface SetupTokenFile {
  v: 1;
  tokens: Record<string, StoredSetupToken>;
}

const EMPTY: SetupTokenFile = { v: 1, tokens: {} };

function encPath(): string {
  return path.join(getWalletDataDir(), "setup-tokens.enc.json");
}

function legacyPath(): string {
  return path.join(getWalletDataDir(), "setup-tokens.json");
}

function getMap(): Map<string, StoredSetupToken> {
  if (!g.__arkSetupTokens) g.__arkSetupTokens = new Map();
  if (!g.__arkSetupTokensLoaded) {
    g.__arkSetupTokensLoaded = true;
    const file = readEncryptedFile(encPath(), legacyPath(), EMPTY);
    const now = Date.now();
    for (const [id, entry] of Object.entries(file.tokens)) {
      if (now <= entry.exp) g.__arkSetupTokens.set(id, entry);
    }
  }
  return g.__arkSetupTokens;
}

function persist(): void {
  const tokens: SetupTokenFile["tokens"] = {};
  for (const [id, entry] of getMap()) tokens[id] = entry;
  writeEncryptedFile(encPath(), { v: 1, tokens });
}

export function pruneSetupTokens(): void {
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

export function putSetupToken(
  id: string,
  entry: StoredSetupToken,
): void {
  pruneSetupTokens();
  getMap().set(id, entry);
  persist();
}

export function getSetupToken(id: string): StoredSetupToken | undefined {
  pruneSetupTokens();
  const entry = getMap().get(id);
  if (!entry || Date.now() > entry.exp) return undefined;
  return entry;
}

export function deleteSetupToken(id: string): boolean {
  const deleted = getMap().delete(id);
  if (deleted) persist();
  return deleted;
}
