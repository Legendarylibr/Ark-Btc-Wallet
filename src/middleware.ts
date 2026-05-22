import { NextRequest, NextResponse } from "next/server";
import { isValidNonceUuid } from "@/lib/crypto/nonce-format";
import { SESSION_COOKIE } from "@/lib/crypto/cookie";
import {
  assertAllowedMethod,
  assertArkClient,
  assertLocalApiHost,
  assertLocalOrigin,
  assertSameSiteFetch,
  assertStrictFetchSite,
  assertStrictReadFetchSite,
} from "@/lib/inbound-security";
import {
  isReadCryptoPostPath,
  isReadProtectedPath,
} from "@/lib/webauthn/pending-op-paths";
import { isValidSessionId } from "@/lib/security/session-id";
import { withApiSecurityHeaders } from "@/lib/security/api-headers";

const WALLET_API_PREFIX = "/api/wallet";
const API_PREFIX = "/api/";
/** Pre-session barkd readiness (no Ed25519 session). */
const WALLET_PRESESSION_PATHS = new Set(["/api/wallet/ready"]);
const MIN_SIG_LENGTH = 80;

function apiNext(): NextResponse {
  return withApiSecurityHeaders(NextResponse.next());
}

function apiReject(response: NextResponse): NextResponse {
  return withApiSecurityHeaders(response);
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(API_PREFIX)) {
    return NextResponse.next();
  }

  const methodBlock = assertAllowedMethod(request);
  if (methodBlock) return apiReject(methodBlock);

  const hostBlock = assertLocalApiHost(request);
  if (hostBlock) return apiReject(hostBlock);

  const clientBlock = assertArkClient(request);
  if (clientBlock) return apiReject(clientBlock);

  const fetchBlock = assertSameSiteFetch(request) ?? assertStrictFetchSite(request);
  if (fetchBlock) return apiReject(fetchBlock);

  const originBlock = assertLocalOrigin(request);
  if (originBlock) return apiReject(originBlock);

  if (request.nextUrl.pathname.startsWith(WALLET_API_PREFIX)) {
    const pathname = request.nextUrl.pathname;
    if (
      request.method === "GET" &&
      WALLET_PRESESSION_PATHS.has(pathname)
    ) {
      return apiNext();
    }
    if (request.method === "GET" && isReadProtectedPath(pathname)) {
      const readBlock = assertStrictReadFetchSite(request);
      if (readBlock) return apiReject(readBlock);
    }
    if (request.method === "POST" && isReadCryptoPostPath(pathname)) {
      const syncBlock = assertStrictFetchSite(request);
      if (syncBlock) return apiReject(syncBlock);
    }
  } else {
    return apiNext();
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId || !isValidSessionId(sessionId)) {
    return apiReject(
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
    !bodyHash ||
    !isValidNonceUuid(nonce)
  ) {
    return apiReject(
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
