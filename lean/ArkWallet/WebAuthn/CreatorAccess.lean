import ArkWallet.Auth.Session
import ArkWallet.Crypto.SecureCompare
import ArkWallet.WebAuthn.PendingOp

namespace ArkWallet.WebAuthn

open ArkWallet.Auth
open ArkWallet.Crypto

/--
  `verifyPendingOpCreatorAccess` (`verify-pending-op-access.ts`).
  Only the Ed25519 identity that created a pending op may fetch auth-options.
-/
structure CreatorAccessInput where
  sessionId : Option String
  sessionStore : SessionStore
  creatorPublicKeyB64 : Option String
  signerPublicKeyB64 : String
  now : Nat
  deriving Inhabited

inductive CreatorAccessResult
  | allow
  | deny
  deriving BEq, Repr, DecidableEq

def verifyPendingOpCreatorAccess (inp : CreatorAccessInput) : CreatorAccessResult :=
  match inp.creatorPublicKeyB64 with
  | none => .deny
  | some creator =>
    if !constantTimeEqualString inp.signerPublicKeyB64 creator then
      .deny
    else
      match inp.sessionId with
      | some sid =>
        match getSession inp.sessionStore sid inp.now with
        | some _ => .allow  -- session verify assumed upstream
        | none => .allow  -- stale cookie → pre-session path (unlock after failed logout)
      | none => .allow

def pendingOpHasCreator (op : PendingOperation) (creator : String) : Bool :=
  op.creatorPublicKeyB64 == creator

end ArkWallet.WebAuthn
