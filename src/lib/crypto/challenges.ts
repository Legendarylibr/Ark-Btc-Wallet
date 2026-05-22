import { bytesToBase64 } from "./ed25519";
import {
  claimExpiringKey,
  deleteExpiringKey,
  hasExpiringKey,
} from "@/lib/persisted-scoped-store";

export {
  challengeMessage,
  webauthnSetupMessage,
} from "./challenge-messages";

const STORE = "wallet-register-challenges";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function issueChallenge(): { challenge: string; expiresAt: number } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = bytesToBase64(bytes);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  claimExpiringKey(STORE, challenge, CHALLENGE_TTL_MS);
  return { challenge, expiresAt };
}

export function hasChallenge(challenge: string): boolean {
  return hasExpiringKey(STORE, challenge);
}

export function consumeChallenge(challenge: string): boolean {
  if (!hasExpiringKey(STORE, challenge)) return false;
  deleteExpiringKey(STORE, challenge);
  return true;
}
