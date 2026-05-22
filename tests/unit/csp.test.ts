import { describe, expect, it } from "vitest";
import {
  API_CONTENT_SECURITY_POLICY,
  buildPageContentSecurityPolicy,
} from "@/lib/security/csp";

describe("content security policy", () => {
  it("page CSP uses nonce for scripts (no unsafe-inline in script-src)", () => {
    const csp = buildPageContentSecurityPolicy("test-nonce-abc");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce-abc' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("API CSP blocks inline scripts", () => {
    expect(API_CONTENT_SECURITY_POLICY).not.toContain("unsafe-inline");
    expect(API_CONTENT_SECURITY_POLICY).toContain("default-src 'none'");
  });
});
