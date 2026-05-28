import { describe, expect, it } from "vitest";
import { pendingOpTypeForPath } from "@/lib/webauthn/pending-op-paths";

describe("pendingOpTypeForPath", () => {
  it("does not require hardware for send estimate (fee preview only)", () => {
    expect(
      pendingOpTypeForPath("/api/wallet/send/estimate", ""),
    ).toBeNull();
  });

  it("maps send to send op", () => {
    expect(pendingOpTypeForPath("/api/wallet/send", "")).toBe("send");
  });

  it("maps address rotate", () => {
    expect(
      pendingOpTypeForPath("/api/wallet/address", "?rotate=1"),
    ).toBe("rotate-address");
  });
});
