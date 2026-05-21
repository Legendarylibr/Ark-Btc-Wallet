import { createHash } from "node:crypto";
import { clientIp } from "@/lib/crypto/rate-limit";

/** Binds session to IP (when proxied) + User-Agent — meaningful even when IP is always "local" */
export function hashClientBinding(request: Request): string {
  const ua = request.headers.get("user-agent") ?? "";
  const ip = clientIp(request);
  return createHash("sha256")
    .update(`${ip}\n${ua}`)
    .digest("hex")
    .slice(0, 16);
}
