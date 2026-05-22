import { pruneNonceStore } from "@/lib/crypto/nonce-store";
import { pruneRateLimitStore } from "@/lib/crypto/rate-limit";
import { pruneExpiredSessions } from "@/lib/crypto/session-store";
import { pruneSetupTokens } from "@/lib/crypto/setup-token-store";
import { pruneUnlockLimits } from "@/lib/crypto/unlock-rate-limit";
import { pruneUnlockTokenBindings } from "@/lib/crypto/unlock-token-binding-store";
import { pruneAllScopedExpiringStores } from "@/lib/persisted-scoped-store";
import { prunePendingOps } from "@/lib/webauthn/pending-op-store";

/** Drop expired server-side auth/ephemeral state (no pubkey pins / WebAuthn creds). */
export function purgeEphemeralServerData(): void {
  pruneExpiredSessions();
  pruneNonceStore();
  pruneRateLimitStore();
  pruneUnlockLimits();
  pruneAllScopedExpiringStores();
  prunePendingOps();
  pruneSetupTokens();
  pruneUnlockTokenBindings();
}
