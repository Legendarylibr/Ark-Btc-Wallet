import { NextResponse } from "next/server";
import { API_CONTENT_SECURITY_POLICY } from "@/lib/security/csp";

const API_CACHE = "no-store, no-cache, must-revalidate";
const API_PRAGMA = "no-cache";

/** Apply hardening headers to API JSON responses */
export function withApiSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", API_CACHE);
  response.headers.set("Pragma", API_PRAGMA);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Content-Security-Policy", API_CONTENT_SECURITY_POLICY);
  return response;
}

export function secureJsonResponse(
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  return withApiSecurityHeaders(NextResponse.json(body, init));
}
