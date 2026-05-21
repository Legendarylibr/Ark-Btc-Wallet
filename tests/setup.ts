import { afterEach, vi } from "vitest";
import { cleanupTempWalletDataDirs } from "./helpers/env";

afterEach(() => {
  cleanupTempWalletDataDirs();
  vi.unstubAllEnvs();
});
