import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { assertApiSecurity } from "@/lib/inbound-security";
import { isReadProtectedPath } from "@/lib/webauthn/pending-op-paths";

describe("API security surface", () => {
  it("rejects wallet API without ark client header", () => {
    const res = assertApiSecurity(
      new NextRequest("http://127.0.0.1:3000/api/wallet/balance", {
        method: "GET",
        headers: {
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
        },
      }),
    );
    expect(res?.status).toBe(403);
  });

  it("marks balance and history as read-protected", () => {
    expect(isReadProtectedPath("/api/wallet/balance")).toBe(true);
    expect(isReadProtectedPath("/api/wallet/history")).toBe(true);
    expect(isReadProtectedPath("/api/wallet/sync")).toBe(false);
  });
});
