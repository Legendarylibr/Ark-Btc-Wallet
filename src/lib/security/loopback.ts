/** Loopback-only hosts allowed for Host / Origin / Referer checks */

export const LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

export function isLoopbackUrl(urlString: string): boolean {
  try {
    return isLoopbackHostname(new URL(urlString).hostname);
  } catch {
    return false;
  }
}

export function hostFromRequestHeader(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  return hostHeader.split(":")[0]?.toLowerCase() ?? null;
}
