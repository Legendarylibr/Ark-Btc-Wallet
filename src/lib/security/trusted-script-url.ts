/** Pure allowlist for Trusted Types `createScriptURL` (mirrored in Lean). */

export function trustedScriptUrlAllowed(origin: string, url: string): boolean {
  if (url.startsWith("/")) return true;
  if (url.startsWith(`${origin}/`)) return true;
  return false;
}
