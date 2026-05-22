import type { NextResponse } from "next/server";
import { SERVER_SESSION_TTL_MS } from "@/lib/security/constants";

/** __Host- prefix requires Secure + Path=/ and no Domain attribute */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-wallet_sid" : "wallet_sid";

const SESSION_MAX_AGE_SEC = Math.floor(SERVER_SESSION_TTL_MS / 1000);

export function setSessionCookie(res: NextResponse, sessionId: string): void {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

/** Client must send this header on logout (CSRF hardening) */
export const LOGOUT_HEADER = "x-ark-wallet-logout";
