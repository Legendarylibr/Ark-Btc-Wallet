/** Content-Security-Policy builders (pages use per-request nonces). */

const SIGNET_CONNECT =
  "https://ark.signet.2nd.dev https://esplora.signet.2nd.dev";

function isSdkBackend(): boolean {
  return process.env.NEXT_PUBLIC_WALLET_BACKEND === "sdk";
}

/** Minimal CSP for JSON API responses (no inline scripts). */
export const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; script-src 'self'; frame-ancestors 'none'";

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
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ];

  if (process.env.ENABLE_HSTS === "true") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
