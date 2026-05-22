import { afterEach, describe, expect, it, vi } from "vitest";
import { SETUP_TOKEN_HEADER } from "@/lib/webauthn/constants";
import { SETUP_VAULT_PROOF_REQUIRED } from "@/lib/webauthn/setup-gate";
import { apiRequest } from "../helpers/request";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

vi.mock("@/lib/barkd", () => ({
  barkd: {
    walletExists: vi.fn(async () => false),
    walletStatus: vi.fn(async () => ({ fingerprint: "fp-oracle-test" })),
  },
}));

describe("webauthn setup gate", () => {
  afterEach(() => {
    cleanupTempWalletDataDirs();
    vi.clearAllMocks();
  });

  it("register-options returns same 401 without setup token when no wallet file", async () => {
    useTempWalletDataDir();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.walletExists).mockResolvedValue(false);

    const { GET } = await import(
      "@/app/api/auth/webauthn/register-options/route"
    );
    const res = await GET(apiRequest("/api/auth/webauthn/register-options"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: SETUP_VAULT_PROOF_REQUIRED });
    expect(barkd.walletExists).not.toHaveBeenCalled();
  });

  it("register-options returns same 401 with invalid setup token when wallet exists", async () => {
    useTempWalletDataDir();
    const { barkd } = await import("@/lib/barkd");
    vi.mocked(barkd.walletExists).mockResolvedValue(true);

    const { GET } = await import(
      "@/app/api/auth/webauthn/register-options/route"
    );
    const res = await GET(
      apiRequest("/api/auth/webauthn/register-options", {
        headers: { [SETUP_TOKEN_HEADER]: crypto.randomUUID() },
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: SETUP_VAULT_PROOF_REQUIRED });
    expect(barkd.walletExists).not.toHaveBeenCalled();
  });
});
