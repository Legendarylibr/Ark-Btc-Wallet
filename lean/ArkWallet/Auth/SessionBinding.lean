import ArkWallet.Auth.Session

namespace ArkWallet.Auth

/-- Mirrors `ensureSessionClientBinding` — no lazy bind. -/
inductive BindingResult
  | ok
  | missing
  | mismatch
  deriving BEq

def ensureSessionClientBinding (s : WalletSession) (binding : String) : BindingResult :=
  match s.clientBinding with
  | none => .missing
  | some b => if b == binding then .ok else .mismatch

/-- On mismatch the TS runtime destroys the session; model as explicit transition. -/
def destroyOnBindingMismatch (store : SessionStore) (sessionId : String)
    (result : BindingResult) : SessionStore :=
  match result with
  | .mismatch => destroySession store sessionId
  | _ => store

end ArkWallet.Auth
