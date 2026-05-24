/** Throws when WebAuthn / platform authenticator APIs are unavailable. */
export function assertWebAuthnAvailable(): void {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw new Error("WebAuthn is not available in this browser");
  }
}
