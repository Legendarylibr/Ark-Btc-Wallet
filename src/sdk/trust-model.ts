/**
 * SDK (browser WASM) mode is a separate product trust model from barkd mode.
 * Do not document or implement it as a drop-in replacement.
 */

export const SDK_MODE_LABEL = "Browser wallet (SDK)";

export const SDK_TRUST_SUMMARY =
  "Keys and VTXOs live in this browser tab — not in barkd. Different security than the recommended desktop setup.";

export const SDK_TRUST_BULLETS = [
  "Recovery phrase is created and stored in this app (encrypted in IndexedDB).",
  "Passkey mode: WebAuthn PRF derives the vault key — unlock is your device, not a typed passphrase.",
  "Recovery passphrase required at create if you lose the passkey.",
  "Malware or XSS in the browser can act while the wallet is unlocked.",
  "No local :3535 bypass — but that is not the same as barkd-grade isolation.",
] as const;

export const BARKD_TRUST_ONE_LINER =
  "Recommended: barkd holds bitcoin keys; this app only gates access with Ed25519 + server WebAuthn.";
