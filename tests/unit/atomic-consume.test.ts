import { afterEach, describe, expect, it } from "vitest";
import { consumeChallenge, issueChallenge } from "@/lib/crypto/challenges";
import {
  claimSetupTokenForOptions,
  consumeSetupToken,
  issueSetupToken,
  validateSetupToken,
} from "@/lib/crypto/setup-token";
import {
  consumeUnlockAttemptToken,
  issueUnlockAttemptToken,
  validateUnlockAttemptToken,
} from "@/lib/crypto/unlock-attempt-token";
import {
  claimUnlockCheckSlot,
  unlockAttemptAllowed,
} from "@/lib/crypto/unlock-rate-limit";
import {
  atomicClaimPendingOpAuthOptions,
  atomicConsumePendingOp,
} from "@/lib/webauthn/pending-op-store";
import { createPendingOp } from "@/lib/webauthn/pending-op";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

const CREATOR_PK = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("atomic single-use consumes", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("setup token consume is single-use under repeated calls", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk", "fp");
    expect(validateSetupToken(token, "fp")?.publicKeyB64).toBe("pk");
    expect(consumeSetupToken(token, "fp")?.publicKeyB64).toBe("pk");
    expect(consumeSetupToken(token, "fp")).toBeNull();
  });

  it("setup token survives failed verify path until consume", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk", "fp");
    expect(validateSetupToken(token, "fp")).not.toBeNull();
    expect(validateSetupToken(token, "fp")).not.toBeNull();
    expect(consumeSetupToken(token, "fp")).not.toBeNull();
    expect(validateSetupToken(token, "fp")).toBeNull();
  });

  it("setup token options cooldown holds under back-to-back claims", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk", "fp");
    expect(claimSetupTokenForOptions(token, "fp")).not.toBeNull();
    expect(claimSetupTokenForOptions(token, "fp")).toBeNull();
  });

  it("unlock token validate-then-consume preserves token on peek", () => {
    useTempWalletDataDir();
    const token = issueUnlockAttemptToken("bind-a");
    expect(validateUnlockAttemptToken(token, "bind-a")).toBe(true);
    expect(validateUnlockAttemptToken(token, "bind-a")).toBe(true);
    expect(consumeUnlockAttemptToken(token, "bind-a")).toBe(true);
    expect(validateUnlockAttemptToken(token, "bind-a")).toBe(false);
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

  it("unlock check slot claim is atomic under parallel budget", () => {
    useTempWalletDataDir();
    const ip = `parallel-${Date.now()}`;
    expect(unlockAttemptAllowed(ip)).toBe(true);
    for (let i = 0; i < 8; i++) {
      expect(claimUnlockCheckSlot(ip)).toBe(true);
    }
    expect(claimUnlockCheckSlot(ip)).toBe(false);
  });

  it("pending op atomic consume is single-use", () => {
    useTempWalletDataDir();
    const fp = "fp-atomic";
    const hash = "body-hash-1";
    const opId = createPendingOp(fp, "send", hash, CREATOR_PK);
    expect(atomicConsumePendingOp(opId, fp, "send", hash)).toBe(true);
    expect(atomicConsumePendingOp(opId, fp, "send", hash)).toBe(false);
  });

  it("pending op auth-options cooldown limits back-to-back claims", () => {
    useTempWalletDataDir();
    const fp = "fp-cooldown";
    const opId = createPendingOp(fp, "send", "hash-2", CREATOR_PK);
    expect(atomicClaimPendingOpAuthOptions(opId, fp)).toBe(true);
    expect(atomicClaimPendingOpAuthOptions(opId, fp)).toBe(false);
  });
});
