import path from "path";
import { getWalletDataDir } from "@/lib/data-dir";
import { mutateEncryptedFile } from "@/lib/encrypted-file";

export interface StoredSetupToken {
  publicKeyB64: string;
  fingerprint: string;
  exp: number;
  /** Last register-options issue time — limits prompt spam per token. */
  optionsIssuedAt?: number;
}

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

function pruneTokens(
  tokens: SetupTokenFile["tokens"],
  now: number,
): SetupTokenFile["tokens"] {
  const pruned: SetupTokenFile["tokens"] = {};
  for (const [id, entry] of Object.entries(tokens)) {
    if (now <= entry.exp) pruned[id] = entry;
  }
  return pruned;
}

function readSetupTokenFile(): SetupTokenFile {
  const now = Date.now();
  return mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const tokens = pruneTokens(f.tokens, now);
    if (Object.keys(tokens).length === Object.keys(f.tokens).length) {
      return f;
    }
    return { v: 1 as const, tokens };
  });
}

export function pruneSetupTokens(): void {
  readSetupTokenFile();
}

export function putSetupToken(id: string, entry: StoredSetupToken): void {
  const now = Date.now();
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const tokens = pruneTokens(f.tokens, now);
    tokens[id] = entry;
    return { v: 1 as const, tokens };
  });
}

export function getSetupToken(id: string): StoredSetupToken | undefined {
  const file = readSetupTokenFile();
  const entry = file.tokens[id];
  if (!entry || Date.now() > entry.exp) return undefined;
  return entry;
}

export function deleteSetupToken(id: string): boolean {
  let deleted = false;
  mutateEncryptedFile(encPath(), legacyPath(), EMPTY, (f) => {
    const tokens = pruneTokens(f.tokens, Date.now());
    if (!(id in tokens)) return f;
    delete tokens[id];
    deleted = true;
    return { v: 1 as const, tokens };
  });
  return deleted;
}
