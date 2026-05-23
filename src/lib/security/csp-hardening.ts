import {
  API_CONTENT_SECURITY_POLICY,
  buildPageContentSecurityPolicy,
  TRUSTED_TYPES_POLICY_NAME,
} from "@/lib/security/csp";

/** Substrings every page CSP must include (XSS / injection hardening). */
export const PAGE_CSP_HARDENING_MARKERS = [
  "script-src-attr 'none'",
  "require-trusted-types-for 'script'",
  `trusted-types ${TRUSTED_TYPES_POLICY_NAME}`,
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "worker-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "'strict-dynamic'",
] as const;

/** Substrings every API JSON CSP must include. */
export const API_CSP_HARDENING_MARKERS = [
  "default-src 'none'",
  "script-src 'none'",
  "script-src-attr 'none'",
  "frame-ancestors 'none'",
] as const;

export function cspContainsAll(
  csp: string,
  markers: readonly string[],
): boolean {
  return markers.every((m) => csp.includes(m));
}

export function pageCspMeetsHardening(csp: string): boolean {
  return cspContainsAll(csp, PAGE_CSP_HARDENING_MARKERS);
}

export function apiCspMeetsHardening(csp: string): boolean {
  return cspContainsAll(csp, API_CSP_HARDENING_MARKERS);
}

/** Built-in policies satisfy hardening (used in tests + FV extract). */
export function builtInPageCspMeetsHardening(nonce: string): boolean {
  return pageCspMeetsHardening(buildPageContentSecurityPolicy(nonce));
}

export function builtInApiCspMeetsHardening(): boolean {
  return apiCspMeetsHardening(API_CONTENT_SECURITY_POLICY);
}

/** Primary `script-src` must not include `unsafe-inline` (style-src may). */
export function pageScriptSrcNoUnsafeInline(csp: string): boolean {
  const marker = "script-src ";
  const idx = csp.indexOf(marker);
  if (idx < 0) return true;
  const rest = csp.slice(idx + marker.length);
  const firstDirective = rest.split(";")[0] ?? rest;
  return !firstDirective.includes("unsafe-inline");
}
