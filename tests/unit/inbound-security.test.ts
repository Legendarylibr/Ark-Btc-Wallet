import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertApiSecurity,
  assertArkClient,
  assertLocalApiHost,
  assertLocalOrigin,
  assertSameSiteFetch,
} from "@/lib/inbound-security";
import { ARK_CLIENT_HEADER, ARK_CLIENT_VALUE } from "@/lib/ark-client";

function req(
  url: string,
  init?: { method?: string; headers?: Record<string, string> },
) {
  return new NextRequest(url, {
    method: init?.method ?? "GET",
    headers: init?.headers,
  });
}

describe("inbound-security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects non-loopback host", () => {
    const block = assertLocalApiHost(
      req("http://192.168.1.1:3000/api/health", {
        headers: { host: "192.168.1.1:3000" },
      }),
    );
    expect(block?.status).toBe(403);
  });

  it("allows loopback host", () => {
    expect(
      assertLocalApiHost(
        req("http://127.0.0.1:3000/api/health", {
          headers: { host: "127.0.0.1:3000" },
        }),
      ),
    ).toBeNull();
  });

  it("requires ark client header", () => {
    expect(assertArkClient(req("http://127.0.0.1/api"))?.status).toBe(403);
    expect(
      assertArkClient(
        req("http://127.0.0.1/api", {
          headers: { [ARK_CLIENT_HEADER]: ARK_CLIENT_VALUE },
        }),
      ),
    ).toBeNull();
  });

  it("blocks cross-site POST", () => {
    const block = assertSameSiteFetch(
      req("http://127.0.0.1/api/wallet/send", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      }),
    );
    expect(block?.status).toBe(403);
  });

  it("requires loopback origin on POST without referer", () => {
    const block = assertLocalOrigin(
      req("http://127.0.0.1/api/wallet/send", { method: "POST" }),
    );
    expect(block?.status).toBe(403);
  });

  it("allows loopback origin on POST", () => {
    expect(
      assertLocalOrigin(
        req("http://127.0.0.1/api/wallet/send", {
          method: "POST",
          headers: { origin: "http://127.0.0.1:3000" },
        }),
      ),
    ).toBeNull();
  });

  it("skips origin check for GET", () => {
    expect(assertLocalOrigin(req("http://127.0.0.1/api/health"))).toBeNull();
  });

  it("assertApiSecurity chains checks", () => {
    const ok = assertApiSecurity(
      req("http://127.0.0.1/api/health", {
        headers: {
          host: "127.0.0.1:3000",
          [ARK_CLIENT_HEADER]: ARK_CLIENT_VALUE,
          origin: "http://localhost:3000",
        },
      }),
    );
    expect(ok).toBeNull();
  });
});
