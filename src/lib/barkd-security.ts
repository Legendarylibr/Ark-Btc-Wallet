/** Ensures barkd is only reached on loopback — blocks SSRF / remote wallet proxying */

const LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

const BLOCKED_HOSTS = new Set(["0.0.0.0", "[::]", "[::ffff:127.0.0.1]"]);

export function assertLoopbackBarkdUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid BARKD_URL: ${urlString}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`BARKD_URL must be http(s), got ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(`BARKD_URL host ${host} is not allowed`);
  }

  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(
      `BARKD_URL must point to loopback (127.0.0.1 / localhost), not ${host}`,
    );
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    console.warn(
      "[ark-wallet] Production barkd should use HTTPS to localhost tunnel or local TLS",
    );
  }
}

export function getValidatedBarkdUrl(): string {
  const url = process.env.BARKD_URL ?? "http://127.0.0.1:3535";
  assertLoopbackBarkdUrl(url);
  return url.replace(/\/$/, "");
}
