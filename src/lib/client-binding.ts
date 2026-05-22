import { createHash } from "node:crypto";
import { clientIp } from "@/lib/crypto/rate-limit";

/** Binds session to IP (when proxied) + browser fingerprint headers */
export function hashClientBinding(request: Request): string {
  const ua = request.headers.get("user-agent") ?? "";
  const lang = request.headers.get("accept-language") ?? "";
  const secChUa = request.headers.get("sec-ch-ua") ?? "";
  const ip = clientIp(request);
  return createHash("sha256")
    .update(`${ip}\n${ua}\n${lang}\n${secChUa}`)
    .digest("hex")
    .slice(0, 16);
}
