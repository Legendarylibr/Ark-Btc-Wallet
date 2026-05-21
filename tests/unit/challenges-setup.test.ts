import { describe, expect, it } from "vitest";
import {
  challengeMessage,
  consumeChallenge,
  hasChallenge,
  issueChallenge,
  webauthnSetupMessage,
} from "@/lib/crypto/challenges";
import {
  consumeSetupToken,
  issueSetupToken,
  validateSetupToken,
} from "@/lib/crypto/setup-token";

describe("challenges", () => {
  it("issues and consumes challenge once", () => {
    const { challenge } = issueChallenge();
    expect(hasChallenge(challenge)).toBe(true);
    expect(consumeChallenge(challenge)).toBe(true);
    expect(consumeChallenge(challenge)).toBe(false);
    expect(hasChallenge(challenge)).toBe(false);
  });

  it("uses distinct setup vs register messages", () => {
    const c = "dGVzdA==";
    const setup = new TextDecoder().decode(webauthnSetupMessage(c));
    const reg = new TextDecoder().decode(challengeMessage(c));
    expect(setup).not.toBe(reg);
    expect(setup).toContain("wallet-webauthn-setup");
  });
});

describe("setup-token", () => {
  it("issues and validates token for fingerprint", () => {
    const token = issueSetupToken("pk-b64", "fp-abc");
    expect(validateSetupToken(token, "fp-abc")?.publicKeyB64).toBe("pk-b64");
    expect(validateSetupToken(token, "fp-wrong")).toBeNull();
  });

  it("consumes token once", () => {
    const token = issueSetupToken("pk", "fp");
    expect(consumeSetupToken(token, "fp")?.publicKeyB64).toBe("pk");
    expect(consumeSetupToken(token, "fp")).toBeNull();
  });
});
