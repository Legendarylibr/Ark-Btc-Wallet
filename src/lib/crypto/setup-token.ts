import {
  atomicClaimSetupTokenForOptions,
  atomicConsumeSetupToken,
  getSetupToken,
  putSetupToken,
} from "./setup-token-store";

const TTL_MS = 10 * 60 * 1000;
const OPTIONS_COOLDOWN_MS = 60_000;

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

/** Issue register-options at most once per minute per setup token. */
export function claimSetupTokenForOptions(
  token: string | null | undefined,
  fingerprint: string,
): { publicKeyB64: string } | null {
  if (!token) return null;
  const entry = atomicClaimSetupTokenForOptions(
    token,
    fingerprint,
    OPTIONS_COOLDOWN_MS,
  );
  if (!entry) return null;
  return { publicKeyB64: entry.publicKeyB64 };
}

export function consumeSetupToken(
  token: string | null | undefined,
  fingerprint: string,
): { publicKeyB64: string } | null {
  if (!token) return null;
  const entry = atomicConsumeSetupToken(token, fingerprint);
  if (!entry) return null;
  return { publicKeyB64: entry.publicKeyB64 };
}
