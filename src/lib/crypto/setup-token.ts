import {
  deleteSetupToken,
  getSetupToken,
  putSetupToken,
} from "./setup-token-store";

const TTL_MS = 10 * 60 * 1000;

export function issueSetupToken(
  publicKeyB64: string,
  fingerprint: string,
): string {
  const id = crypto.randomUUID();
  putSetupToken(id, {
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
  const entry = getSetupToken(token);
  if (!entry || entry.fingerprint !== fingerprint) return null;
  return { publicKeyB64: entry.publicKeyB64 };
}

export function consumeSetupToken(
  token: string | null | undefined,
  fingerprint: string,
): { publicKeyB64: string } | null {
  const valid = validateSetupToken(token, fingerprint);
  if (!valid) return null;
  deleteSetupToken(token!);
  return valid;
}
