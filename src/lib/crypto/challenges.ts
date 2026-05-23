import { bytesToBase64 } from "./ed25519";
import {
  claimExpiringKey,
  consumeExpiringKey,
  hasExpiringKey,
} from "@/lib/persisted-scoped-store";

export {
  challengeMessage,
  webauthnSetupMessage,
} from "./challenge-messages";

const STORE = "wallet-register-challenges";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function issueChallenge(): { challenge: string; expiresAt: number } {
  for (let attempt = 0; attempt < 3; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const challenge = bytesToBase64(bytes);
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    if (claimExpiringKey(STORE, challenge, CHALLENGE_TTL_MS)) {
      return { challenge, expiresAt };
    }
  }
  throw new Error("Could not issue register challenge");
}

export function hasChallenge(challenge: string): boolean {
  return hasExpiringKey(STORE, challenge);
}

export function consumeChallenge(challenge: string): boolean {
  return consumeExpiringKey(STORE, challenge);
}
