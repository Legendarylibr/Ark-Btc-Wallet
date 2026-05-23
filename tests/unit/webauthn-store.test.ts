import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  claimSetupTokenForOptions,
  issueSetupToken,
} from "@/lib/crypto/setup-token";
import {
  getWebAuthnCredential,
  saveWebAuthnCredential,
  updateWebAuthnCounter,
} from "@/lib/webauthn/store";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("webauthn store", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("only advances counter monotonically", () => {
    useTempWalletDataDir();
    const fp = "test-fingerprint";
    saveWebAuthnCredential(fp, {
      credentialId: "cred-id",
      publicKey: "pk",
      counter: 5,
      deviceType: "singleDevice",
      registeredAt: Date.now(),
    });

    updateWebAuthnCounter(fp, 3);
    expect(getWebAuthnCredential(fp)?.counter).toBe(5);

    updateWebAuthnCounter(fp, 8);
    expect(getWebAuthnCredential(fp)?.counter).toBe(8);

    updateWebAuthnCounter(fp, 6);
    expect(getWebAuthnCredential(fp)?.counter).toBe(8);
  });
});

describe("setup token options cooldown", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("limits register-options to once per minute per token", () => {
    useTempWalletDataDir();
    const token = issueSetupToken("pk-b64", "fp-1");
    expect(claimSetupTokenForOptions(token, "fp-1")).not.toBeNull();
    expect(claimSetupTokenForOptions(token, "fp-1")).toBeNull();
  });
});
