import { NextRequest, NextResponse } from "next/server";
import { ARK_CLIENT_HEADER, ARK_CLIENT_VALUE } from "@/lib/ark-client";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import { withApiSecurityHeaders } from "@/lib/security/api-headers";

const WALLET_API_PREFIX = "/api/wallet";
const API_PREFIX = "/api/";
const MIN_SIG_LENGTH = 80;

const LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

function rejectRemoteHost(request: NextRequest): NextResponse | null {
  if (process.env.ALLOW_REMOTE_HOST === "true") return null;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host || !LOCAL_HOSTS.has(host)) {
    return NextResponse.json(
      { error: "API only accepts loopback Host headers" },
      { status: 403 },
    );
  }
  return null;
}

function isLoopbackOriginUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function rejectBadOrigin(request: NextRequest): NextResponse | null {
  if (process.env.ALLOW_REMOTE_HOST === "true") return null;

  const origin = request.headers.get("origin");
  if (origin) {
    if (!isLoopbackOriginUrl(origin)) {
      return NextResponse.json({ error: "Invalid Origin" }, { status: 403 });
    }
    return null;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const referer = request.headers.get("referer");
    if (referer && isLoopbackOriginUrl(referer)) return null;
    return NextResponse.json({ error: "Missing Origin" }, { status: 403 });
  }

  return null;
}

function rejectUnknownClient(request: NextRequest): NextResponse | null {
  if (request.headers.get(ARK_CLIENT_HEADER) !== ARK_CLIENT_VALUE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function apiNext(): NextResponse {
  return withApiSecurityHeaders(NextResponse.next());
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith(API_PREFIX)) {
    const hostBlock = rejectRemoteHost(request);
    if (hostBlock) return withApiSecurityHeaders(hostBlock);
    const clientBlock = rejectUnknownClient(request);
    if (clientBlock) return withApiSecurityHeaders(clientBlock);
    const originBlock = rejectBadOrigin(request);
    if (originBlock) return withApiSecurityHeaders(originBlock);
  }

  if (!request.nextUrl.pathname.startsWith(WALLET_API_PREFIX)) {
    return request.nextUrl.pathname.startsWith(API_PREFIX)
      ? apiNext()
      : NextResponse.next();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return withApiSecurityHeaders(
      NextResponse.json(
        { error: "Cryptographic session required — unlock wallet" },
        { status: 401 },
      ),
    );
  }

  const sig = request.headers.get("x-wallet-signature");
  const pk = request.headers.get("x-wallet-public-key");
  const ts = request.headers.get("x-wallet-timestamp");
  const nonce = request.headers.get("x-wallet-nonce");
  const bodyHash = request.headers.get("x-wallet-body-hash");

  if (
    !sig ||
    sig.length < MIN_SIG_LENGTH ||
    !pk ||
    !ts ||
    !nonce ||
    !bodyHash
  ) {
    return withApiSecurityHeaders(
      NextResponse.json(
        { error: "Missing or invalid cryptographic headers" },
        { status: 401 },
      ),
    );
  }

  return apiNext();
}

export const config = {
  matcher: "/api/:path*",
};
