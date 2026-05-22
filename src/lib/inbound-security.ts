import { NextRequest, NextResponse } from "next/server";
import { ARK_CLIENT_HEADER, ARK_CLIENT_VALUE } from "@/lib/ark-client";
import {
  hostFromRequestHeader,
  isLoopbackHostname,
  isLoopbackUrl,
} from "@/lib/security/loopback";

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

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Reject API calls when the app is reached from a non-loopback Host (LAN exposure). */
export function assertLocalApiHost(request: NextRequest): NextResponse | null {
  warnInsecureConfig();
  if (process.env.ALLOW_REMOTE_HOST === "true") {
    return null;
  }

  const host = hostFromRequestHeader(request.headers.get("host"));
  if (!host || !isLoopbackHostname(host)) {
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
    if (referer && isLoopbackUrl(referer)) return null;
    return NextResponse.json({ error: "Missing Origin" }, { status: 403 });
  }

  if (!isLoopbackUrl(origin)) {
    return NextResponse.json({ error: "Invalid Origin" }, { status: 403 });
  }

  return null;
}

/**
 * Block cross-site and nested-document POSTs when Sec-Fetch-* is sent.
 */
export function assertSameSiteFetch(request: NextRequest): NextResponse | null {
  warnInsecureConfig();
  if (process.env.ALLOW_REMOTE_HOST === "true") return null;
  if (!MUTATION_METHODS.has(request.method)) return null;

  const site = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (site === "cross-site") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dest = request.headers.get("sec-fetch-dest")?.toLowerCase();
  if (dest && (dest === "document" || dest === "iframe" || dest === "embed")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/** Optional strict mode: mutation requests must send same-origin Sec-Fetch-Site */
export function assertStrictFetchSite(request: NextRequest): NextResponse | null {
  if (process.env.STRICT_FETCH_SITE !== "true") return null;
  if (!MUTATION_METHODS.has(request.method)) return null;

  const site = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (site !== "same-origin") {
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

const BLOCKED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);

export function assertAllowedMethod(request: NextRequest): NextResponse | null {
  if (BLOCKED_METHODS.has(request.method)) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  return null;
}

export function assertApiSecurity(request: NextRequest): NextResponse | null {
  return (
    assertAllowedMethod(request) ??
    assertLocalApiHost(request) ??
    assertArkClient(request) ??
    assertSameSiteFetch(request) ??
    assertStrictFetchSite(request) ??
    assertLocalOrigin(request)
  );
}
