type SetupTokenGlobal = typeof globalThis & {
  __arkSetupTokens?: Map<
    string,
    { publicKeyB64: string; fingerprint: string; exp: number }
  >;
};

const g = globalThis as SetupTokenGlobal;
const tokens = g.__arkSetupTokens ??= new Map();

const TTL_MS = 10 * 60 * 1000;

export function issueSetupToken(
  publicKeyB64: string,
  fingerprint: string,
): string {
  const id = crypto.randomUUID();
  tokens.set(id, {
    publicKeyB64,
    fingerprint,
    exp: Date.now() + TTL_MS,
  });
  return id;
}

export function validateSetupToken(
  token: string | null | undefined,
  fingerprint: string,
): { publicKeyB64: string } | null {
  if (!token) return null;
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    tokens.delete(token);
    return null;
  }
  if (entry.fingerprint !== fingerprint) return null;
  return { publicKeyB64: entry.publicKeyB64 };
}

export function consumeSetupToken(
  token: string | null | undefined,
  fingerprint: string,
): { publicKeyB64: string } | null {
  const valid = validateSetupToken(token, fingerprint);
  if (!valid) return null;
  tokens.delete(token!);
  return valid;
}
