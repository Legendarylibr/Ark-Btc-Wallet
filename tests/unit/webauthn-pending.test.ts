import { afterEach, describe, expect, it } from "vitest";
import {
  consumePendingOp,
  createPendingOp,
  invalidatePendingOp,
  matchesPendingOp,
  pendingOpTypeForPath,
  VALID_PENDING_OP_TYPES,
} from "@/lib/webauthn/pending-op";
import { parsePendingOpType } from "@/lib/webauthn/pending-op-paths";
import { HARDWARE_REQUIRED_PATHS } from "@/lib/webauthn/constants";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

describe("webauthn pending-op", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  const creatorPk = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

  it("matches and consumes once", () => {
    useTempWalletDataDir();
    const fp = "fp-1";
    const hash = "body-hash-abc";
    const id = createPendingOp(fp, "send", hash, creatorPk);
    expect(matchesPendingOp(id, fp, "send", hash)).toBe(true);
    expect(consumePendingOp(id, fp, "send", hash)).toBe(true);
    expect(consumePendingOp(id, fp, "send", hash)).toBe(false);
  });

  it("invalidates pending op", () => {
    useTempWalletDataDir();
    const id = createPendingOp("fp", "refresh", "h1", creatorPk);
    invalidatePendingOp(id);
    expect(matchesPendingOp(id, "fp", "refresh", "h1")).toBe(false);
  });

  it("parsePendingOpType accepts known types only", () => {
    expect(parsePendingOpType("send")).toBe("send");
    expect(parsePendingOpType("bogus")).toBeNull();
  });

  it("maps API paths to op types", () => {
    expect(HARDWARE_REQUIRED_PATHS.size).toBe(4);
    expect(VALID_PENDING_OP_TYPES).toContain("read-access");
    expect(pendingOpTypeForPath("/api/wallet/send/estimate", "")).toBe("send");
    expect(pendingOpTypeForPath("/api/wallet/send", "")).toBe("send");
    expect(pendingOpTypeForPath("/api/wallet/refresh", "")).toBe("refresh");
    expect(
      pendingOpTypeForPath("/api/wallet/address", "?rotate=1"),
    ).toBe("rotate-address");
    expect(pendingOpTypeForPath("/api/wallet/address", "")).toBeNull();
  });
});
