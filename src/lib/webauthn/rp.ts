/** Shared WebAuthn RP metadata (server routes + browser SDK). */

export const ARK_WEBAUTHN_RP_NAME = "Ark Wallet";

export function rpIdFromHostname(hostname: string): string {
  return (hostname || "localhost").toLowerCase();
}

/** Browser-only RP config (hostname from `window.location`). */
export function getClientWebAuthnRp(): { rpName: string; rpID: string } {
  if (typeof window === "undefined") {
    throw new Error("getClientWebAuthnRp requires a browser");
  }
  return {
    rpName: ARK_WEBAUTHN_RP_NAME,
    rpID: rpIdFromHostname(window.location.hostname),
  };
}
