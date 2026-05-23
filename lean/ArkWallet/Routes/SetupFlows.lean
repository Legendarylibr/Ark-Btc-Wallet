import ArkWallet.Auth.SetupToken
import ArkWallet.WebAuthn.CreatorAccess
import ArkWallet.WebAuthn.SetupGate

namespace ArkWallet.Routes

open ArkWallet.Auth
open ArkWallet.WebAuthn

/-- WebAuthn setup / hardware registration flows. -/
inductive SetupFlowStep
  | setupChallenge
  | setupProof
  | registerOptions
  | registerVerify
  | authOptions
  | pendingOp
  deriving Repr

def setupFlowUniformError (step : SetupFlowStep) (ok : Bool) : Option SetupError :=
  if ok then none
  else
    match step with
    | .registerOptions | .registerVerify => some setupVaultProofRequired
    | .authOptions => some hardwareAuthUnavailable
    | _ => none

def setupProofRateLimitPerPubkey : Nat := 3

end ArkWallet.Routes
