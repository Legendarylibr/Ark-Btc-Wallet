import type { NextResponse } from "next/server";

/** __Host- prefix requires Secure + Path=/ and no Domain attribute */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-wallet_sid" : "wallet_sid";

export function setSessionCookie(res: NextResponse, sessionId: string): void {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
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
