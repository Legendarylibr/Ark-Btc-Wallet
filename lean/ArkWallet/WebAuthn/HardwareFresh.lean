import ArkWallet.Auth.Session
import ArkWallet.Prelude.Time

namespace ArkWallet.WebAuthn

open ArkWallet.Auth
open ArkWallet.Prelude

/-- Mirrors `isHardwareFreshForRead` (requires live session + recent hardware). -/
def isHardwareFreshForRead (store : SessionStore) (sessionId : String) (now : Nat) : Bool :=
  match getSession store sessionId now with
  | none => false
  | some s =>
    match s.lastHardwareAt with
    | none => false
    | some t => hardwareFresh now t

end ArkWallet.WebAuthn
