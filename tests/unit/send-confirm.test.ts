import { describe, expect, it } from "vitest";
import { isSendConfirmDisabled } from "@/lib/send-confirm";

describe("isSendConfirmDisabled", () => {
  const affordable = { affordable: true };
  const unaffordable = { affordable: false };

  it("blocks while loading or estimating", () => {
    expect(
      isSendConfirmDisabled({
        loading: true,
        estimateLoading: false,
        estimate: affordable,
        error: null,
      }),
    ).toBe(true);
    expect(
      isSendConfirmDisabled({
        loading: false,
        estimateLoading: true,
        estimate: null,
        error: null,
      }),
    ).toBe(true);
  });

  it("blocks without estimate, on error, or when unaffordable", () => {
    expect(
      isSendConfirmDisabled({
        loading: false,
        estimateLoading: false,
        estimate: null,
        error: null,
      }),
    ).toBe(true);
    expect(
      isSendConfirmDisabled({
        loading: false,
        estimateLoading: false,
        estimate: affordable,
        error: "Estimate failed",
      }),
    ).toBe(true);
    expect(
      isSendConfirmDisabled({
        loading: false,
        estimateLoading: false,
        estimate: unaffordable,
        error: null,
      }),
    ).toBe(true);
  });

  it("allows confirm when estimate is affordable and ready", () => {
    expect(
      isSendConfirmDisabled({
        loading: false,
        estimateLoading: false,
        estimate: affordable,
        error: null,
      }),
    ).toBe(false);
  });
});
