import {
  claimExpiringKey,
  deleteExpiringKey,
  hasExpiringKey,
} from "@/lib/persisted-scoped-store";
import { isValidNonceUuid } from "./nonce-format";

const STORE = "unlock-attempt-tokens";
const TOKEN_TTL_MS = 2 * 60 * 1000;

/** Single-use token from unlock-check; required for unlock-failed. */
export function issueUnlockAttemptToken(): string {
  const id = crypto.randomUUID();
  claimExpiringKey(STORE, id, TOKEN_TTL_MS);
  return id;
}

export function consumeUnlockAttemptToken(token: string): boolean {
  if (!isValidNonceUuid(token)) return false;
  if (!hasExpiringKey(STORE, token)) return false;
  deleteExpiringKey(STORE, token);
  return true;
}
