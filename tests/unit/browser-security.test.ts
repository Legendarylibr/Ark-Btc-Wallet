import { describe, expect, it } from "vitest";
import {
  shouldInvokeLock,
  shouldLockAtRegistration,
} from "@/lib/security/browser-threat-model";
import {
  API_CONTENT_SECURITY_POLICY,
  buildPageContentSecurityPolicy,
} from "@/lib/security/csp";
import {
  apiCspMeetsHardening,
  builtInApiCspMeetsHardening,
  builtInPageCspMeetsHardening,
  pageCspMeetsHardening,
  pageScriptSrcNoUnsafeInline,
} from "@/lib/security/csp-hardening";
import {
  assertSecureBrowserContext,
  signingPermitted,
} from "@/lib/security/execution-context";
import { trustedScriptUrlAllowed } from "@/lib/security/trusted-script-url";

describe("CSP hardening", () => {
  it("built-in page CSP meets hardening markers", () => {
    expect(builtInPageCspMeetsHardening("test-nonce-abc")).toBe(true);
    const csp = buildPageContentSecurityPolicy("n");
    expect(pageCspMeetsHardening(csp)).toBe(true);
    expect(pageScriptSrcNoUnsafeInline(csp)).toBe(true);
  });

  it("built-in API CSP meets hardening markers", () => {
    expect(builtInApiCspMeetsHardening()).toBe(true);
    expect(apiCspMeetsHardening(API_CONTENT_SECURITY_POLICY)).toBe(true);
  });

  it("rejects weakened page CSP", () => {
    expect(pageCspMeetsHardening("default-src 'self'")).toBe(false);
  });
});

describe("trusted script URL allowlist", () => {
  const origin = "http://127.0.0.1:3000";

  it("allows same-origin paths", () => {
    expect(trustedScriptUrlAllowed(origin, "/_next/static/chunk.js")).toBe(
      true,
    );
    expect(
      trustedScriptUrlAllowed(origin, "http://127.0.0.1:3000/_next/x.js"),
    ).toBe(true);
  });

  it("blocks external script URLs", () => {
    expect(trustedScriptUrlAllowed(origin, "https://evil.example/x.js")).toBe(
      false,
    );
  });
});

describe("browser threat model", () => {
  it("locks on blur/hide by default", () => {
    expect(shouldInvokeLock("blur")).toBe(true);
    expect(shouldInvokeLock("tabHidden")).toBe(true);
    expect(shouldInvokeLock("pagehide")).toBe(true);
  });

  it("respects opt-out for blur/hide", () => {
    expect(shouldInvokeLock("blur", { lockOnBlur: false })).toBe(false);
    expect(shouldInvokeLock("tabHidden", { lockOnHide: false })).toBe(false);
  });

  it("always locks on embed or insecure context signals", () => {
    expect(shouldInvokeLock("embedded", { lockOnBlur: false })).toBe(true);
    expect(shouldInvokeLock("insecureContext", { lockOnHide: false })).toBe(
      true,
    );
  });

  it("locks at registration when embedded or insecure", () => {
    expect(shouldLockAtRegistration(true, true)).toBe(true);
    expect(shouldLockAtRegistration(false, false)).toBe(true);
    expect(shouldLockAtRegistration(false, true)).toBe(false);
  });
});

describe("execution context", () => {
  it("signing permitted only when not embedded", () => {
    expect(signingPermitted(false)).toBe(true);
    expect(signingPermitted(true)).toBe(false);
  });

  it("assertSecureBrowserContext passes in node tests", () => {
    expect(() => assertSecureBrowserContext()).not.toThrow();
  });
});
