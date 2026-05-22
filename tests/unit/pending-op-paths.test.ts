import { describe, expect, it } from "vitest";
import { pendingOpTypeForPath } from "@/lib/webauthn/pending-op";

describe("pendingOpTypeForPath", () => {
  it("maps send estimate to send op with hardware", () => {
    expect(
      pendingOpTypeForPath("/api/wallet/send/estimate", ""),
    ).toBe("send");
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
