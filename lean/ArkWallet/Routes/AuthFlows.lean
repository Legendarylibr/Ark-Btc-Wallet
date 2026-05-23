import ArkWallet.World
import ArkWallet.Auth.Session

namespace ArkWallet.Routes

open ArkWallet
open ArkWallet.Auth

/-- Auth flow transitions on `World` (register / unlock / logout). -/
inductive AuthFlowStep
  | unlockCheck
  | unlockFailed
  | barkdReady
  | challenge
  | pendingOpSessionRegister
  | authOptionsSessionRegister
  | register
  | logout
  deriving Repr, BEq, Inhabited

structure AuthFlowState where
  world : World
  step : AuthFlowStep

instance : Inhabited AuthFlowState where
  default := { world := World.empty, step := .unlockCheck }

/-- Unlock: token issued → consumed on barkd-ready; pre-session on pending-op. -/
def unlockFlowRequiresPreSession (step : AuthFlowStep) : Bool :=
  step == .barkdReady || step == .pendingOpSessionRegister ||
  step == .authOptionsSessionRegister

def registerFlowRequiresHardware (step : AuthFlowStep) : Bool :=
  step == .register

end ArkWallet.Routes
