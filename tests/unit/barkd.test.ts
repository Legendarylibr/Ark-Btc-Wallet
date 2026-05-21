import { describe, expect, it } from "vitest";
import {
  assertLoopbackBarkdUrl,
  getValidatedBarkdUrl,
} from "@/lib/barkd-security";
import { estimateArkSendFee, BarkdError } from "@/lib/barkd";
import { safeApiError, safeBarkdMessage } from "@/lib/safe-error";

const SAMPLE_FEES = {
  network: "signet",
  fees: {
    board: { min_fee_sat: 10, base_fee_sat: 5, ppm: 1000 },
    refresh: { min_fee_sat: 20, base_fee_sat: 0, ppm: 0 },
    send: { min_fee_sat: 15, base_fee_sat: 3, ppm: 500 },
    arkoor: { min_fee_sat: 15, base_fee_sat: 3, ppm: 500 },
  },
};

describe("barkd-security", () => {
  it("allows loopback URLs only", () => {
    expect(() => assertLoopbackBarkdUrl("http://evil.com:3535")).toThrow();
    expect(() => assertLoopbackBarkdUrl("http://0.0.0.0:3535")).toThrow();
    expect(() => assertLoopbackBarkdUrl("http://127.0.0.1:3535")).not.toThrow();
    expect(() => assertLoopbackBarkdUrl("http://localhost:3535")).not.toThrow();
  });

  it("getValidatedBarkdUrl strips trailing slash", () => {
    const prev = process.env.BARKD_URL;
    process.env.BARKD_URL = "http://127.0.0.1:3535/";
    expect(getValidatedBarkdUrl()).toBe("http://127.0.0.1:3535");
    if (prev === undefined) delete process.env.BARKD_URL;
    else process.env.BARKD_URL = prev;
  });
});

describe("estimateArkSendFee", () => {
  it("returns max tier with buffer", () => {
    const fee = estimateArkSendFee(100_000, SAMPLE_FEES);
    expect(fee).toBeGreaterThanOrEqual(23);
  });

  it("returns 0 without fee info", () => {
    expect(estimateArkSendFee(1000, null)).toBe(0);
  });
});

describe("safe-error", () => {
  it("sanitizes barkd errors", () => {
    const clientErr = new BarkdError("Insufficient balance", 400);
    expect(safeBarkdMessage(clientErr)).toBe("Insufficient balance");
    const serverErr = new BarkdError("internal stack\ntrace", 500);
    expect(safeBarkdMessage(serverErr)).toMatch(/daemon error/i);
    expect(safeApiError(serverErr)).toMatch(/daemon error/i);
  });
});
