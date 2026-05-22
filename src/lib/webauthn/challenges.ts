import {
  claimExpiringKey,
  deleteExpiringKey,
  hasExpiringKey,
} from "@/lib/persisted-scoped-store";

const STORE = "webauthn-challenges";
const TTL_MS = 5 * 60 * 1000;

function challengeKey(scope: string, challenge: string): string {
  return `${scope}:${challenge}`;
}

export function storeWebAuthnChallenge(scope: string, challenge: string): void {
  claimExpiringKey(STORE, challengeKey(scope, challenge), TTL_MS);
}

export function consumeWebAuthnChallenge(
  scope: string,
  challenge: string,
): boolean {
  const key = challengeKey(scope, challenge);
  if (!hasExpiringKey(STORE, key)) return false;
  deleteExpiringKey(STORE, key);
  return true;
}
