import { describe, expect, it } from "vitest";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";

describe("SDK WebAuthn assertion verify module", () => {
  it("exports client-side verify helpers", async () => {
    const mod = await import("@/sdk/webauthn/assertion-verify");
    expect(typeof mod.verifySdkAuthenticationAssertion).toBe("function");
    expect(typeof mod.verifySdkRegistrationClientData).toBe("function");
    expect(typeof mod.spkiFromStoredBase64).toBe("function");
  });

  it("nonce format matches server expectations for SDK challenges", () => {
    expect(isValidNonceUuid(crypto.randomUUID())).toBe(true);
  });
});
