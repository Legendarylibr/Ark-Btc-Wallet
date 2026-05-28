import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bytesToBase64, generateKeypair } from "@/lib/crypto/ed25519";
import { createSession } from "@/lib/crypto/session-store";
import { LOGOUT_HEADER, SESSION_COOKIE } from "@/lib/crypto/cookie";
import { hashClientBinding } from "@/lib/client-binding";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";
import { apiRequest } from "../helpers/request";
import { buildSignedWalletHeaders } from "../helpers/signing";

const mockBalance = {
  spendable_sat: 50_000,
  pending_lightning_send_sat: 0,
  claimable_lightning_receive_sat: 0,
  pending_in_round_sat: 0,
  pending_board_sat: 0,
  pending_exit_sat: null,
};

vi.mock("@/lib/security/ephemeral-init.server", () => ({
  ensureEphemeralPruned: vi.fn(),
}));

vi.mock("@/lib/security/purge-ephemeral.server", () => ({
  purgeEphemeralServerData: vi.fn(),
}));

vi.mock("@/lib/barkd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/barkd")>();
  class BarkdError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
      this.name = "BarkdError";
    }
  }
  return {
    ...actual,
    BarkdError,
    estimateArkSendFee: actual.estimateArkSendFee,
    barkd: {
      daemonReachable: vi.fn(async () => true),
      walletExists: vi.fn(async () => true),
      walletStatus: vi.fn(async () => ({ fingerprint: "fp-barkd-ready" })),
      balance: vi.fn(async () => mockBalance),
      sync: vi.fn(async () => undefined),
      arkInfo: vi.fn(async () => null),
      sendArk: vi.fn(async () => ({ movement_id: "mov-1", message: null })),
    },
  };
});

/** Valid bech32m ark1… (see tests/unit/ark-address-utils.test.ts) */
const VALID_ARK_DEST = "ark1qpzry9x8gf2tvdw0s3jn965jph";

function clientBinding(): string {
  return hashClientBinding(apiRequest("/"));
}

describe("API route handlers", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.daemonReachable).mockResolvedValue(true);
    vi.mocked(barkd.walletExists).mockResolvedValue(true);
    vi.mocked(barkd.walletStatus).mockResolvedValue({ fingerprint: "fp-barkd-ready" });
    vi.mocked(barkd.balance).mockResolvedValue(mockBalance);
    vi.mocked(barkd.sync).mockResolvedValue(undefined);
    vi.mocked(barkd.arkInfo).mockResolvedValue(null);
    vi.mocked(barkd.sendArk).mockResolvedValue({ movement_id: "mov-1", message: null });
  });

  afterEach(() => {
    cleanupTempWalletDataDirs();
  });

  it("GET /api/health returns daemon ok with security headers", async () => {
    useTempWalletDataDir();
    const { GET } = await import("@/app/api/health/route");
    const res = await GET(apiRequest("/api/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'",
    );
  });

  it("GET /api/wallet/ready is deprecated", async () => {
    const { GET } = await import("@/app/api/wallet/ready/route");
    const res = await GET(apiRequest("/api/wallet/ready"));
    expect(res.status).toBe(410);
  });

  it("POST /api/auth/barkd-ready requires unlock token and pre-session signature", async () => {
    useTempWalletDataDir();
    const { POST: unlockCheck } = await import("@/app/api/auth/unlock-check/route");
    const checkRes = await unlockCheck(
      apiRequest("/api/auth/unlock-check", { method: "POST" }),
    );
    const { unlockToken } = (await checkRes.json()) as { unlockToken: string };

    const { generateKeypair, bytesToBase64 } = await import("@/lib/crypto/ed25519");
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const body = JSON.stringify({ unlockToken });
    const headers = await buildSignedWalletHeaders({
      method: "POST",
      pathname: "/api/auth/barkd-ready",
      body,
      privateKey,
      publicKeyB64,
    });

    const { barkd } = await import("@/lib/barkd");
    const { POST } = await import("@/app/api/auth/barkd-ready/route");
    const res = await POST(
      apiRequest("/api/auth/barkd-ready", { method: "POST", headers, body }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
    expect(barkd.daemonReachable).toHaveBeenCalled();
    expect(barkd.walletExists).not.toHaveBeenCalled();
  });

  it("GET /api/auth/challenge issues challenge", async () => {
    useTempWalletDataDir();
    const { GET } = await import("@/app/api/auth/challenge/route");
    const res = await GET(apiRequest("/api/auth/challenge"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { challenge?: string; expiresAt?: number };
    expect(body.challenge).toBeTruthy();
    expect(body.expiresAt).toBeGreaterThan(Date.now());
  });

  it("GET /api/auth/webauthn/status is deprecated", async () => {
    const { GET } = await import("@/app/api/auth/webauthn/status/route");
    const res = await GET(apiRequest("/api/auth/webauthn/status"));
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toMatch(/Deprecated/i);
  });

  it("POST /api/auth/unlock-check returns token when allowed", async () => {
    useTempWalletDataDir();
    const { POST } = await import("@/app/api/auth/unlock-check/route");
    const res = await POST(apiRequest("/api/auth/unlock-check", { method: "POST" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { allowed?: boolean; unlockToken?: string };
    expect(body.allowed).toBe(true);
    expect(body.unlockToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("GET /api/wallet/balance returns barkd balance when signed", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(
      publicKeyB64,
      "fp-barkd-ready",
      clientBinding(),
    );
    const headers = await buildSignedWalletHeaders({
      method: "GET",
      pathname: "/api/wallet/balance",
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });

    const { GET } = await import("@/app/api/wallet/balance/route");
    const res = await GET(
      apiRequest("/api/wallet/balance", { method: "GET", headers }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockBalance);
  });

  it("POST /api/wallet/send/estimate succeeds with Ed25519 only (no hardware)", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(
      publicKeyB64,
      "fp-barkd-ready",
      clientBinding(),
    );
    const body = JSON.stringify({
      destination: VALID_ARK_DEST,
      amount_sat: 1000,
    });
    const headers = await buildSignedWalletHeaders({
      method: "POST",
      pathname: "/api/wallet/send/estimate",
      body,
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });

    const { POST } = await import("@/app/api/wallet/send/estimate/route");
    const res = await POST(
      apiRequest("/api/wallet/send/estimate", { method: "POST", headers, body }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      affordable?: boolean;
      fee_sat?: number;
      amount_sat?: number;
    };
    expect(json.amount_sat).toBe(1000);
    expect(json.affordable).toBe(true);
    expect(typeof json.fee_sat).toBe("number");
  });

  it("POST /api/wallet/send requires hardware headers", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(
      publicKeyB64,
      "fp-barkd-ready",
      clientBinding(),
    );
    const body = JSON.stringify({
      destination: VALID_ARK_DEST,
      amount_sat: 1000,
    });
    const headers = await buildSignedWalletHeaders({
      method: "POST",
      pathname: "/api/wallet/send",
      body,
      privateKey,
      publicKeyB64,
      sessionId: session.id,
    });

    const { POST } = await import("@/app/api/wallet/send/route");
    const res = await POST(
      apiRequest("/api/wallet/send", { method: "POST", headers, body }),
    );
    expect(res.status).toBe(401);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toMatch(/hardware/i);
  });

  it("POST /api/auth/logout destroys session", async () => {
    useTempWalletDataDir();
    const { publicKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const session = createSession(publicKeyB64, null, clientBinding());

    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(
      apiRequest("/api/auth/logout", {
        method: "POST",
        headers: {
          [LOGOUT_HEADER]: "1",
          cookie: `${SESSION_COOKIE}=${session.id}`,
        },
      }),
    );
    expect(res.status).toBe(200);
    const { getSession } = await import("@/lib/crypto/session-store");
    expect(getSession(session.id)).toBeNull();
  });
});
