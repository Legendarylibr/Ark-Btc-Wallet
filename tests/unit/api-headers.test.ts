import { describe, expect, it } from "vitest";
import {
  secureJsonResponse,
  withApiSecurityHeaders,
} from "@/lib/security/api-headers";
import { NextResponse } from "next/server";

describe("api-headers", () => {
  it("sets cache and nosniff on responses", () => {
    const res = withApiSecurityHeaders(NextResponse.json({ ok: true }));
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("secureJsonResponse wraps JSON", async () => {
    const res = secureJsonResponse({ x: 1 }, { status: 200 });
    expect(res.status).toBe(200);
    expect(res.headers.get("Pragma")).toBe("no-cache");
    expect(await res.json()).toEqual({ x: 1 });
  });
});
