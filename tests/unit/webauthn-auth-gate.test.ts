import { afterEach, describe, expect, it, vi } from "vitest";
import { bytesToBase64, generateKeypair, sign } from "@/lib/crypto/ed25519";
import {
  canonicalRequest,
  CRYPTO_HEADERS,
  hashBody,
  signingPath,
} from "@/lib/crypto/canonical";
import { HARDWARE_AUTH_UNAVAILABLE } from "@/lib/webauthn/setup-gate";
import { createPendingOp } from "@/lib/webauthn/pending-op";
import { resetPendingOpMemoryCacheForTests } from "@/lib/webauthn/pending-op-store";
import {
  resetWebAuthnMemoryCacheForTests,
  saveWebAuthnCredential,
} from "@/lib/webauthn/store";
import { apiRequest } from "../helpers/request";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

vi.mock("@/lib/barkd", () => ({
  barkd: {
    walletStatus: vi.fn(async () => ({ fingerprint: "fp-test" })),
  },
}));

async function signedAuthOptionsRequest(
  opId: string,
  publicKeyB64: string,
  privateKey: Uint8Array,
) {
  const pathname = "/api/auth/webauthn/auth-options";
  const search = `?opId=${encodeURIComponent(opId)}`;
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const bodyHash = hashBody("");
  const path = signingPath(pathname, search);
  const message = canonicalRequest({
    method: "GET",
    path,
    timestamp,
    nonce,
    bodyHash,
  });
  const signature = await sign(message, privateKey);

  return apiRequest(`${pathname}${search}`, {
    method: "GET",
    headers: {
      [CRYPTO_HEADERS.timestamp]: timestamp,
      [CRYPTO_HEADERS.nonce]: nonce,
      [CRYPTO_HEADERS.signature]: bytesToBase64(signature),
      [CRYPTO_HEADERS.bodyHash]: bodyHash,
      [CRYPTO_HEADERS.publicKey]: publicKeyB64,
    },
  });
}

describe("GET /api/auth/webauthn/auth-options", () => {
  afterEach(() => {
    cleanupTempWalletDataDirs();
    resetPendingOpMemoryCacheForTests();
    resetWebAuthnMemoryCacheForTests();
    vi.clearAllMocks();
  });

  it("returns uniform 401 for missing op and for no barkd fingerprint", async () => {
    useTempWalletDataDir();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.walletStatus).mockResolvedValue({ fingerprint: null });

    const { GET } = await import("@/app/api/auth/webauthn/auth-options/route");

    const missingOp = await GET(
      apiRequest("/api/auth/webauthn/auth-options?opId=not-a-uuid"),
    );
    expect(missingOp.status).toBe(400);

    const randomOp = await GET(
      apiRequest(
        `/api/auth/webauthn/auth-options?opId=${crypto.randomUUID()}`,
      ),
    );
    expect(randomOp.status).toBe(401);
    expect(await randomOp.json()).toEqual({ error: HARDWARE_AUTH_UNAVAILABLE });
  });

  it("rejects pending op without creator signature", async () => {
    useTempWalletDataDir();
    resetPendingOpMemoryCacheForTests();
    resetWebAuthnMemoryCacheForTests();
    const creatorPk = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const opId = createPendingOp("fp-test", "read-access", "abc", creatorPk);
    const { GET } = await import("@/app/api/auth/webauthn/auth-options/route");

    const res = await GET(
      apiRequest(`/api/auth/webauthn/auth-options?opId=${opId}`),
    );
    expect(res.status).toBe(401);
  });

  it("returns options when creator signs the GET request", async () => {
    useTempWalletDataDir();
    resetPendingOpMemoryCacheForTests();
    resetWebAuthnMemoryCacheForTests();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.walletStatus).mockResolvedValue({ fingerprint: "fp-test" });
    const { publicKey, privateKey } = await generateKeypair();
    const creatorPk = bytesToBase64(publicKey);

    saveWebAuthnCredential("fp-test", {
      credentialId: "cred-id",
      publicKey: "pk",
      counter: 0,
      deviceType: "singleDevice",
      registeredAt: Date.now(),
    });

    const opId = createPendingOp("fp-test", "read-access", "abc", creatorPk);
    const { GET } = await import("@/app/api/auth/webauthn/auth-options/route");

    const res = await GET(
      await signedAuthOptionsRequest(opId, creatorPk, privateKey),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opId).toBe(opId);
    expect(body.options).toBeDefined();
  });

  it("rejects when signer does not match pending op creator", async () => {
    useTempWalletDataDir();
    resetPendingOpMemoryCacheForTests();
    resetWebAuthnMemoryCacheForTests();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.walletStatus).mockResolvedValue({ fingerprint: "fp-test" });
    const { publicKey, privateKey } = await generateKeypair();
    const other = await generateKeypair();
    const creatorPk = bytesToBase64(publicKey);

    saveWebAuthnCredential("fp-test", {
      credentialId: "cred-id",
      publicKey: "pk",
      counter: 0,
      deviceType: "singleDevice",
      registeredAt: Date.now(),
    });

    const opId = createPendingOp("fp-test", "read-access", "abc", creatorPk);
    const { GET } = await import("@/app/api/auth/webauthn/auth-options/route");

    const res = await GET(
      await signedAuthOptionsRequest(
        opId,
        bytesToBase64(other.publicKey),
        other.privateKey,
      ),
    );
    expect(res.status).toBe(401);
  });
});
