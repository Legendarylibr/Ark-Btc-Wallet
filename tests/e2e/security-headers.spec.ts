import { test, expect } from "@playwright/test";

const apiHeaders = { "x-ark-client": "ark-wallet/1" };

test("HTML responses include nonce-based page CSP", async ({ request }) => {
  const res = await request.get("/");
  expect(res.ok()).toBeTruthy();
  const csp = res.headers()["content-security-policy"] ?? "";
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(csp).toContain("require-trusted-types-for 'script'");
});

test("API responses include hardening headers", async ({ request }) => {
  const res = await request.get("/api/health", { headers: apiHeaders });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { ok?: boolean };
  expect(typeof body.ok).toBe("boolean");
  const headers = res.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["cache-control"]).toContain("no-store");
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("script-src 'none'");
});
