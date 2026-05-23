import { afterEach, describe, expect, it, vi } from "vitest";
import { HARDWARE_AUTH_UNAVAILABLE } from "@/lib/webauthn/setup-gate";
import { createPendingOp } from "@/lib/webauthn/pending-op";
import { apiRequest } from "../helpers/request";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

vi.mock("@/lib/barkd", () => ({
  barkd: {
    walletStatus: vi.fn(async () => ({ fingerprint: null })),
  },
}));

describe("GET /api/auth/webauthn/auth-options", () => {
  const creatorPk = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

  afterEach(() => {
    cleanupTempWalletDataDirs();
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

    const opId = createPendingOp("fp-test", "read-access", "abc", creatorPk);
    const noFp = await GET(
      apiRequest(`/api/auth/webauthn/auth-options?opId=${opId}`),
    );
    expect(noFp.status).toBe(401);
    expect(await noFp.json()).toEqual({ error: HARDWARE_AUTH_UNAVAILABLE });
  });
});
