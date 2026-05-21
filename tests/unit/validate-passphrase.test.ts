import { describe, expect, it } from "vitest";
import { parseAmountSat, canAffordSend } from "@/lib/validate";
import { validatePassphrase } from "@/lib/passphrase";

describe("validate", () => {
  it("parseAmountSat accepts positive integers only", () => {
    expect(parseAmountSat(100)).toBe(100);
    expect(parseAmountSat(1.5)).toBeNull();
    expect(parseAmountSat(0)).toBeNull();
    expect(parseAmountSat(-1)).toBeNull();
    expect(parseAmountSat("1")).toBeNull();
  });

  it("canAffordSend includes fee", () => {
    expect(canAffordSend(1000, 500, 400)).toBe(true);
    expect(canAffordSend(1000, 500, 501)).toBe(false);
  });
});

describe("validatePassphrase", () => {
  it("enforces length and character rules", () => {
    expect(validatePassphrase("short")).not.toBeNull();
    expect(validatePassphrase("my-secure-wallet-99")).toBeNull();
    expect(validatePassphrase("onlyletterslongenough")).not.toBeNull();
    expect(validatePassphrase("password123")).not.toBeNull();
  });
});
