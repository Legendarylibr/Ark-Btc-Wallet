import { describe, expect, it } from "vitest";
import {
  isAllowedSecurityKeyDeviceType,
  SECURITY_KEY_AUTHENTICATOR_SELECTION,
  SECURITY_KEY_TRANSPORTS,
} from "@/lib/webauthn/security-key-policy";

describe("security-key-policy", () => {
  it("requires cross-platform authenticators", () => {
    expect(SECURITY_KEY_AUTHENTICATOR_SELECTION.authenticatorAttachment).toBe(
      "cross-platform",
    );
    expect(SECURITY_KEY_AUTHENTICATOR_SELECTION.residentKey).toBe(
      "discouraged",
    );
  });

  it("excludes platform transports", () => {
    expect(SECURITY_KEY_TRANSPORTS).toEqual(["usb", "nfc", "ble"]);
    expect(SECURITY_KEY_TRANSPORTS).not.toContain("internal");
  });

  it("rejects platform passkey device type", () => {
    expect(isAllowedSecurityKeyDeviceType("singleDevice")).toBe(false);
    expect(isAllowedSecurityKeyDeviceType("multiDevice")).toBe(true);
  });
});
