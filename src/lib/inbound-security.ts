import { NextRequest, NextResponse } from "next/server";
import { ARK_CLIENT_HEADER, ARK_CLIENT_VALUE } from "@/lib/ark-client";

const LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

let warnedRemote = false;

function warnInsecureConfig(): void {
  if (warnedRemote) return;
  warnedRemote = true;
  if (process.env.ALLOW_REMOTE_HOST === "true") {
    console.error(
      "[ark-wallet] SECURITY: ALLOW_REMOTE_HOST=true — API accepts non-loopback Host. Do not use in production.",
    );
  }
}

warnInsecureConfig();

function isLoopbackHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

/** Reject API calls when the app is reached from a non-loopback Host (LAN exposure). */
export function assertLocalApiHost(request: NextRequest): NextResponse | null {
  warnInsecureConfig();
  if (process.env.ALLOW_REMOTE_HOST === "true") {
    return null;
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || !isLoopbackHost(host)) {
    return NextResponse.json(
      { error: "API only accepts loopback Host headers" },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Require browser requests to come from this app (loopback Origin).
 * Skipped for GET/HEAD without Origin (health polling).
 */
export function assertLocalOrigin(request: NextRequest): NextResponse | null {
  warnInsecureConfig();
  if (process.env.ALLOW_REMOTE_HOST === "true") {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    if (request.method === "GET" || request.method === "HEAD") {
      return null;
    }
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const host = new URL(referer).hostname.toLowerCase();
        if (isLoopbackHost(host)) return null;
      } catch {
        /* invalid */
      }
    }
    return NextResponse.json({ error: "Missing Origin" }, { status: 403 });
  }

  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (!isLoopbackHost(host)) {
      return NextResponse.json({ error: "Invalid Origin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid Origin" }, { status: 403 });
  }

  return null;
}

/**
 * Block cross-site POSTs when the browser sends Sec-Fetch-Site (CSRF defense in depth).
 * Loopback wallets are still vulnerable to malicious local pages; this catches remote sites.
 */
export function assertSameSiteFetch(request: NextRequest): NextResponse | null {
  warnInsecureConfig();
  if (process.env.ALLOW_REMOTE_HOST === "true") return null;
  if (request.method === "GET" || request.method === "HEAD") return null;

  const site = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (site === "cross-site") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Blocks drive-by local curls that lack the wallet client marker */
export function assertArkClient(request: NextRequest): NextResponse | null {
  if (request.headers.get(ARK_CLIENT_HEADER) !== ARK_CLIENT_VALUE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function assertApiSecurity(request: NextRequest): NextResponse | null {
  return (
    assertLocalApiHost(request) ??
    assertArkClient(request) ??
    assertSameSiteFetch(request) ??
    assertLocalOrigin(request)
  );
}
