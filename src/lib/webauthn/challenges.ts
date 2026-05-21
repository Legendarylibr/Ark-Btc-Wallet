type ChallengeGlobal = typeof globalThis & {
  __arkWebAuthnChallenges?: Map<string, number>;
};

const g = globalThis as ChallengeGlobal;
const challenges = g.__arkWebAuthnChallenges ??= new Map<string, number>();

const TTL_MS = 5 * 60 * 1000;

export function storeWebAuthnChallenge(scope: string, challenge: string): void {
  challenges.set(`${scope}:${challenge}`, Date.now() + TTL_MS);
}

export function consumeWebAuthnChallenge(
  scope: string,
  challenge: string,
): boolean {
  const key = `${scope}:${challenge}`;
  const exp = challenges.get(key);
  if (!exp) return false;
  challenges.delete(key);
  return Date.now() <= exp;
}
