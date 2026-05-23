/** Content-Security-Policy builders (pages use per-request nonces). */

const SIGNET_CONNECT =
  "https://ark.signet.2nd.dev https://esplora.signet.2nd.dev";

/** Trusted Types policy installed in the browser (see trusted-types.ts). */
export const TRUSTED_TYPES_POLICY_NAME = "ark-wallet";

function isSdkBackend(): boolean {
  return process.env.NEXT_PUBLIC_WALLET_BACKEND === "sdk";
}

/** Minimal CSP for JSON API responses (no inline scripts). */
export const API_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'none'",
  "script-src-attr 'none'",
  "style-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** Page CSP with nonce — Next.js applies `x-nonce` to framework scripts. */
export function buildPageContentSecurityPolicy(nonce: string): string {
  const scriptParts = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isSdkBackend()) {
    scriptParts.push("'wasm-unsafe-eval'");
  }

  let connectSrc = "'self'";
  if (isSdkBackend()) {
    connectSrc = `'self' ${SIGNET_CONNECT}`;
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptParts.join(" ")}`,
    "script-src-attr 'none'",
    `script-src-elem ${scriptParts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${connectSrc}`,
    "font-src 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "manifest-src 'self'",
    "media-src 'none'",
    "base-uri 'self'",
    `trusted-types ${TRUSTED_TYPES_POLICY_NAME}`,
    "require-trusted-types-for 'script'",
  ];

  if (process.env.ENABLE_HSTS === "true") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
