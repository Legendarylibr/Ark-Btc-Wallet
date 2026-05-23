import { afterEach, describe, expect, it } from "vitest";
import { consumeChallenge, issueChallenge } from "@/lib/crypto/challenges";
import {
  claimSetupTokenForOptions,
  consumeSetupToken,
  issueSetupToken,
} from "@/lib/crypto/setup-token";
import {
  consumeUnlockAttemptToken,
  issueUnlockAttemptToken,
} from "@/lib/crypto/unlock-attempt-token";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("atomic single-use consumes", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("setup token consume is single-use under repeated calls", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk", "fp");
    expect(consumeSetupToken(token, "fp")?.publicKeyB64).toBe("pk");
    expect(consumeSetupToken(token, "fp")).toBeNull();
    expect(consumeSetupToken(token, "fp")).toBeNull();
  });

  it("setup token options cooldown holds under back-to-back claims", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk", "fp");
    expect(claimSetupTokenForOptions(token, "fp")).not.toBeNull();
    expect(claimSetupTokenForOptions(token, "fp")).toBeNull();
    expect(claimSetupTokenForOptions(token, "fp")).toBeNull();
  });

  it("unlock token consume is single-use", () => {
    useTempWalletDataDir();
    const token = issueUnlockAttemptToken("bind-a");
    expect(consumeUnlockAttemptToken(token, "bind-a")).toBe(true);
    expect(consumeUnlockAttemptToken(token, "bind-a")).toBe(false);
  });

  it("register challenge consume is single-use", () => {
    useTempWalletDataDir();
    const { challenge } = issueChallenge();
    expect(consumeChallenge(challenge)).toBe(true);
    expect(consumeChallenge(challenge)).toBe(false);
  });
});
