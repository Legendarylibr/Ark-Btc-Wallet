import "server-only";

import { purgeEphemeralServerData } from "@/lib/security/purge-ephemeral.server";

let prunedOnBoot = false;

/** Once per process: drop expired ephemeral server state before handling API traffic. */
export function ensureEphemeralPruned(): void {
  if (prunedOnBoot) return;
  prunedOnBoot = true;
  purgeEphemeralServerData();
}
