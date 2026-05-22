import { NextRequest } from "next/server";

/** Loopback API request with ark client marker (matches production browser). */
export function apiRequest(
  path: string,
  init: RequestInit & { method?: string } = {},
): NextRequest {
  const url = `http://127.0.0.1:3000${path}`;
  const headers = new Headers(init.headers);
  if (!headers.has("host")) headers.set("host", "127.0.0.1:3000");
  if (!headers.has("origin")) headers.set("origin", "http://127.0.0.1:3000");
  if (!headers.has("x-ark-client")) headers.set("x-ark-client", "ark-wallet/1");
  if (!headers.has("user-agent")) headers.set("user-agent", "Vitest/ArkWallet");
  return new NextRequest(url, { ...init, headers });
}
