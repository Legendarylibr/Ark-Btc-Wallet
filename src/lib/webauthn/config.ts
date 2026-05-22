import type { NextRequest } from "next/server";
import { ARK_WEBAUTHN_RP_NAME } from "./rp";

export function getWebAuthnConfig(request: NextRequest): {
  rpName: string;
  rpID: string;
  origins: string[];
} {
  const hostHeader = request.headers.get("host") ?? "localhost:3000";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "localhost";
  const port = hostHeader.split(":")[1] ?? "3000";
  const rpID = hostname;

  const origins = new Set<string>();
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin) origins.add(headerOrigin);
  origins.add(`http://${hostHeader}`);
  origins.add(`https://${hostHeader}`);
  if (hostname === "127.0.0.1") {
    origins.add(`http://localhost:${port}`);
  }
  if (hostname === "localhost") {
    origins.add(`http://127.0.0.1:${port}`);
  }

  return {
    rpName: ARK_WEBAUTHN_RP_NAME,
    rpID,
    origins: [...origins],
  };
}
