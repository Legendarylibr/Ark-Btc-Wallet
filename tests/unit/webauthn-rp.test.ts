import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARK_WEBAUTHN_RP_NAME,
  getClientWebAuthnRp,
  rpIdFromHostname,
} from "@/lib/webauthn/rp";

describe("webauthn rp shared config", () => {
  it("normalizes rp id from hostname", () => {
    expect(rpIdFromHostname("LOCALHOST")).toBe("localhost");
    expect(rpIdFromHostname("")).toBe("localhost");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes client rp from window", () => {
    vi.stubGlobal("window", { location: { hostname: "127.0.0.1" } });
    expect(getClientWebAuthnRp()).toEqual({
      rpName: ARK_WEBAUTHN_RP_NAME,
      rpID: "127.0.0.1",
    });
  });
});
