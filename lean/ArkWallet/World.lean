import ArkWallet.Auth.Session
import ArkWallet.Auth.PubkeyPin
import ArkWallet.Auth.SetupToken
import ArkWallet.Auth.UnlockToken
import ArkWallet.Crypto.Challenge
import ArkWallet.Crypto.NonceStore
import ArkWallet.WebAuthn.PendingOp

namespace ArkWallet

open Auth
open Crypto
open WebAuthn

/-- Global abstract state for barkd-mode API routes. -/
structure World where
  sessions : SessionStore
  nonces : NonceStore
  challenges : ChallengeStore
  pendingOps : PendingOpStore
  pins : PinStore
  setupTokens : SetupTokenStore
  unlockTokens : UnlockTokenStore
  deriving Inhabited

def World.empty : World :=
  { sessions := default
    nonces := default
    challenges := default
    pendingOps := default
    pins := default
    setupTokens := default
    unlockTokens := default }

end ArkWallet
