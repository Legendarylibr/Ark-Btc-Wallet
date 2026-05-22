import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { barkd } from "@/lib/barkd";
import { bytesToBase64, generateKeypair } from "@/lib/crypto/ed25519";
import { verifyOrPinPubkey } from "@/lib/crypto/pubkey-pin";
import { apiRequest } from "../helpers/request";
import { buildSignedWalletHeaders } from "../helpers/signing";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

vi.mock("@/lib/barkd", () => ({
  barkd: {
    daemonReachable: vi.fn(async () => true),
    walletExists: vi.fn(async () => true),
    walletStatus: vi.fn(async () => ({ fingerprint: "fp-test-default" })),
  },
}));

async function issueUnlockToken(): Promise<string> {
  const { POST } = await import("@/app/api/auth/unlock-check/route");
  const res = await POST(apiRequest("/api/auth/unlock-check", { method: "POST" }));
  const body = (await res.json()) as { unlockToken: string };
  return body.unlockToken;
}

async function postBarkdReady(options: {
  unlockToken: string;
  privateKey: Uint8Array;
  publicKeyB64: string;
}) {
  const body = JSON.stringify({ unlockToken: options.unlockToken });
  const headers = await buildSignedWalletHeaders({
    method: "POST",
    pathname: "/api/auth/barkd-ready",
    body,
    privateKey: options.privateKey,
    publicKeyB64: options.publicKeyB64,
  });
  const { POST } = await import("@/app/api/auth/barkd-ready/route");
  return POST(apiRequest("/api/auth/barkd-ready", { method: "POST", headers, body }));
}

describe("POST /api/auth/barkd-ready", () => {
  beforeEach(() => {
    vi.mocked(barkd.daemonReachable).mockResolvedValue(true);
    vi.mocked(barkd.walletExists).mockResolvedValue(true);
  });

  afterEach(() => {
    cleanupTempWalletDataDirs();
    vi.clearAllMocks();
    vi.mocked(barkd.daemonReachable).mockResolvedValue(true);
    vi.mocked(barkd.walletExists).mockResolvedValue(true);
    vi.mocked(barkd.walletStatus).mockResolvedValue({
      fingerprint: "fp-test-default",
    });
  });

  it("rejects without unlock token", async () => {
    useTempWalletDataDir();
    const { publicKey, privateKey } = await generateKeypair();
    const publicKeyB64 = bytesToBase64(publicKey);
    const body = JSON.stringify({});
    const headers = await buildSignedWalletHeaders({
      method: "POST",
      pathname: "/api/auth/barkd-ready",
      body,
      privateKey,
      publicKeyB64,
    });
    const { POST } = await import("@/app/api/auth/barkd-ready/route");
    const res = await POST(
      apiRequest("/api/auth/barkd-ready", { method: "POST", headers, body }),
    );
    expect(res.status).toBe(401);
  });

  it("does not call walletExists before pairing", async () => {
    useTempWalletDataDir();
    const token = await issueUnlockToken();
    const { publicKey, privateKey } = await generateKeypair();
    const res = await postBarkdReady({
      unlockToken: token,
      privateKey,
      publicKeyB64: bytesToBase64(publicKey),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
    expect(barkd.walletExists).not.toHaveBeenCalled();
  });

  it("rejects ephemeral key when pubkey is pinned", async () => {
    useTempWalletDataDir();
    vi.mocked(barkd.walletStatus).mockResolvedValue({
      fingerprint: "fp-reject-ephemeral",
    });
    const pinned = await generateKeypair();
    const pinnedB64 = bytesToBase64(pinned.publicKey);
    verifyOrPinPubkey("fp-reject-ephemeral", pinnedB64);

    const token = await issueUnlockToken();
    const ephemeral = await generateKeypair();
    const res = await postBarkdReady({
      unlockToken: token,
      privateKey: ephemeral.privateKey,
      publicKeyB64: bytesToBase64(ephemeral.publicKey),
    });
    expect(res.status).toBe(403);
    expect(barkd.walletExists).not.toHaveBeenCalled();
  });

  it("checks wallet file when pinned pubkey matches", async () => {
    useTempWalletDataDir();
    vi.mocked(barkd.walletStatus).mockResolvedValue({
      fingerprint: "fp-match-wallet",
    });
    const pinned = await generateKeypair();
    const pinnedB64 = bytesToBase64(pinned.publicKey);
    verifyOrPinPubkey("fp-match-wallet", pinnedB64);

    const token = await issueUnlockToken();
    const res = await postBarkdReady({
      unlockToken: token,
      privateKey: pinned.privateKey,
      publicKeyB64: pinnedB64,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true });
    expect(barkd.walletExists).toHaveBeenCalled();
  });
});
