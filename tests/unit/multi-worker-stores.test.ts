import { afterEach, describe, expect, it } from "vitest";
import {
  consumePendingOp,
  createPendingOp,
  getPendingOpDetails,
  matchesPendingOp,
} from "@/lib/webauthn/pending-op";
import {
  deletePendingOp,
  getPendingOp,
  resetPendingOpMemoryCacheForTests,
} from "@/lib/webauthn/pending-op-store";
import { createSession, destroySession, getSession } from "@/lib/crypto/session-store";
import { cleanupTempWalletDataDirs, useTempWalletDataDir } from "../helpers/env";

const PK_B64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const CREATOR_PK = PK_B64;

describe("multi-worker store consistency", () => {
  afterEach(() => cleanupTempWalletDataDirs());

  it("pending op deleted on disk is not visible after cache reset", () => {
    useTempWalletDataDir();
    const fp = "fp-worker";
    const hash = "body-hash";
    const id = createPendingOp(fp, "send", hash, CREATOR_PK);
    expect(getPendingOp(id)).toBeDefined();
    expect(deletePendingOp(id)).toBe(true);

    resetPendingOpMemoryCacheForTests();
    expect(getPendingOp(id)).toBeUndefined();
    expect(getPendingOpDetails(id)).toBeNull();
    expect(matchesPendingOp(id, fp, "send", hash)).toBe(false);
    expect(consumePendingOp(id, fp, "send", hash)).toBe(false);
  });

  it("session destroyed on disk is not visible on fresh read", () => {
    useTempWalletDataDir();
    const session = createSession(PK_B64, "fp-1", "bind-1");
    expect(getSession(session.id)?.barkFingerprint).toBe("fp-1");
    destroySession(session.id);
    expect(getSession(session.id)).toBeNull();
  });
});
