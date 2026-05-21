import { bytesToBase64 } from "./ed25519";

type ChallengeGlobal = typeof globalThis & {
  __arkChallenges?: Map<string, number>;
};

const g = globalThis as ChallengeGlobal;
const challenges = g.__arkChallenges ??= new Map<string, number>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function issueChallenge(): { challenge: string; expiresAt: number } {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const challenge = bytesToBase64(bytes);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challenges.set(challenge, expiresAt);
  return { challenge, expiresAt };
}

export function hasChallenge(challenge: string): boolean {
  const exp = challenges.get(challenge);
  if (!exp) return false;
  return Date.now() <= exp;
}

export function consumeChallenge(challenge: string): boolean {
  const exp = challenges.get(challenge);
  if (!exp) return false;
  challenges.delete(challenge);
  return Date.now() <= exp;
}

export function challengeMessage(challenge: string): Uint8Array {
  return new TextEncoder().encode(`wallet-register\n${challenge}`);
}

export function webauthnSetupMessage(challenge: string): Uint8Array {
  return new TextEncoder().encode(`wallet-webauthn-setup\n${challenge}`);
}
