/** FIDO2 security keys only (USB / NFC / BLE) — not platform passkeys (Touch ID, Windows Hello). */

export const SECURITY_KEY_ONLY_MESSAGE =
  "Only a FIDO2 security key (e.g. YubiKey) is allowed — not Touch ID or Windows Hello";

export const SECURITY_KEY_TRANSPORTS = ["usb", "nfc", "ble"] as const;

export type SecurityKeyTransport = (typeof SECURITY_KEY_TRANSPORTS)[number];

/** Registration / unlock for barkd hardware and SDK secondary hardware. */
export const SECURITY_KEY_AUTHENTICATOR_SELECTION = {
  authenticatorAttachment: "cross-platform" as const,
  residentKey: "discouraged" as const,
  userVerification: "required" as const,
} as const;

/** SDK passkey (PRF) wallets — discoverable credential on a security key. */
export const SECURITY_KEY_PASSKEY_SELECTION = {
  authenticatorAttachment: "cross-platform" as const,
  residentKey: "required" as const,
  userVerification: "required" as const,
} as const;

export function isAllowedSecurityKeyDeviceType(deviceType: string): boolean {
  return deviceType === "multiDevice";
}
