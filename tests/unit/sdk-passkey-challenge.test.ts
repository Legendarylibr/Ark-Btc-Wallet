import { describe, expect, it } from "vitest";
import { sdkPasskeyOpChallenge } from "@/sdk/webauthn/challenges";

describe("sdkPasskeyOpChallenge", () => {
  it("is deterministic per walletId, opId, and bodyHash", () => {
    const a = sdkPasskeyOpChallenge("wallet", "op-1", "hash-a");
    const b = sdkPasskeyOpChallenge("wallet", "op-1", "hash-a");
    const c = sdkPasskeyOpChallenge("wallet", "op-1", "hash-b");
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("changes when opId changes", () => {
    const a = sdkPasskeyOpChallenge("wallet", "op-1", "hash");
    const b = sdkPasskeyOpChallenge("wallet", "op-2", "hash");
    expect(a).not.toEqual(b);
  });
});
