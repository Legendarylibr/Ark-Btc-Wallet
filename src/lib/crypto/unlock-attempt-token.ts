import {
  claimExpiringKey,
  deleteExpiringKey,
  hasExpiringKey,
} from "@/lib/persisted-scoped-store";
import { isValidNonceUuid } from "./nonce-format";
import {
  deleteUnlockTokenBinding,
  getUnlockTokenBinding,
  putUnlockTokenBinding,
} from "./unlock-token-binding-store";

const STORE = "unlock-attempt-tokens";
const TOKEN_TTL_MS = 2 * 60 * 1000;

/** Single-use token from unlock-check; bound to client fingerprint. */
export function issueUnlockAttemptToken(clientBinding: string): string {
  const id = crypto.randomUUID();
  claimExpiringKey(STORE, id, TOKEN_TTL_MS);
  putUnlockTokenBinding(id, clientBinding, Date.now() + TOKEN_TTL_MS);
  return id;
}

export function consumeUnlockAttemptToken(
  token: string,
  clientBinding: string,
): boolean {
  if (!isValidNonceUuid(token)) return false;
  const bound = getUnlockTokenBinding(token);
  if (!bound || bound !== clientBinding) return false;
  if (!hasExpiringKey(STORE, token)) return false;
  deleteExpiringKey(STORE, token);
  deleteUnlockTokenBinding(token);
  return true;
}
