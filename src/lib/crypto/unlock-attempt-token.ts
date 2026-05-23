import { deleteExpiringKey } from "@/lib/persisted-scoped-store";
import { isValidNonceUuid } from "./nonce-format";
import {
  consumeUnlockTokenBinding,
  putUnlockTokenBinding,
} from "./unlock-token-binding-store";

const LEGACY_STORE = "unlock-attempt-tokens";
const TOKEN_TTL_MS = 2 * 60 * 1000;

/** Single-use token from unlock-check; bound to client fingerprint. */
export function issueUnlockAttemptToken(clientBinding: string): string {
  const id = crypto.randomUUID();
  putUnlockTokenBinding(id, clientBinding, Date.now() + TOKEN_TTL_MS);
  return id;
}

export function consumeUnlockAttemptToken(
  token: string,
  clientBinding: string,
): boolean {
  if (!isValidNonceUuid(token)) return false;
  const consumed = consumeUnlockTokenBinding(token, clientBinding);
  if (consumed) {
    deleteExpiringKey(LEGACY_STORE, token);
  }
  return consumed;
}
