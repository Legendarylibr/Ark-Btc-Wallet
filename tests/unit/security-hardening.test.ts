import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import {
  assertAllowedMethod,
  assertSameSiteFetch,
  assertStrictFetchSite,
} from "@/lib/inbound-security";
import { assertBodyWithinLimit } from "@/lib/security/request-limits";
import { isValidSessionId } from "@/lib/security/session-id";
import {
  SERVER_SESSION_IDLE_MS,
  SERVER_SESSION_TTL_MS,
} from "@/lib/security/constants";
import {
  createSession,
  getSession,
  touchSession,
} from "@/lib/crypto/session-store";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("security hardening", () => {
  it("rejects TRACE on API", () => {
    const res = assertAllowedMethod({ method: "TRACE" } as NextRequest);
    expect(res?.status).toBe(405);
  });

  it("blocks cross-site POST", () => {
    const res = assertSameSiteFetch(
      new NextRequest("http://127.0.0.1/api/auth/register", {
        method: "POST",
        headers: {
          "sec-fetch-site": "cross-site",
          origin: "http://127.0.0.1:3000",
        },
      }),
    );
    expect(res?.status).toBe(403);
  });

  it("blocks document dest on API POST", () => {
    const res = assertSameSiteFetch(
      new NextRequest("http://127.0.0.1/api/wallet/send", {
        method: "POST",
        headers: {
          "sec-fetch-dest": "document",
          origin: "http://127.0.0.1:3000",
        },
      }),
    );
    expect(res?.status).toBe(403);
  });

  it("strict fetch site when enabled", () => {
    process.env.STRICT_FETCH_SITE = "true";
    const res = assertStrictFetchSite(
      new NextRequest("http://127.0.0.1/api/wallet/send", {
        method: "POST",
        headers: {
          "sec-fetch-site": "same-site",
          origin: "http://127.0.0.1:3000",
        },
      }),
    );
    expect(res?.status).toBe(403);
    delete process.env.STRICT_FETCH_SITE;
  });

  it("validates session id as UUID", () => {
    expect(isValidSessionId(crypto.randomUUID())).toBe(true);
    expect(isValidSessionId("not-valid")).toBe(false);
  });

  it("rejects oversized body", () => {
    const res = assertBodyWithinLimit("70000", 70000);
    expect(res?.status).toBe(413);
  });
});

describe("server session idle", () => {
  it("expires idle sessions", () => {
    useTempWalletDataDir();
    const pk = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const s = createSession(pk, null, "bind");
    touchSession(s.id);
    const map = (
      globalThis as typeof globalThis & {
        __arkSessions?: Map<string, { lastSeenAt: number }>;
      }
    ).__arkSessions;
    const entry = map?.get(s.id);
    if (entry) {
      entry.lastSeenAt = Date.now() - SERVER_SESSION_IDLE_MS - 1000;
    }
    expect(getSession(s.id)).toBeNull();
    cleanupTempWalletDataDirs();
  });

  it("uses 8h absolute TTL constant", () => {
    expect(SERVER_SESSION_TTL_MS).toBe(8 * 60 * 60 * 1000);
  });
});
