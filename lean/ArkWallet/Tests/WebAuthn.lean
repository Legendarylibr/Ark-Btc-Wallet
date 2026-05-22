import ArkWallet.WebAuthn.PendingOpPaths
import ArkWallet.FvFixtures

namespace ArkWallet.Tests.WebAuthn

open ArkWallet.WebAuthn
open ArkWallet.FvFixtures

def pendingOpTypeToString : PendingOpType → String
  | .send => "send"
  | .refresh => "refresh"
  | .rotateAddress => "rotateAddress"
  | .sessionRegister => "sessionRegister"
  | .readAccess => "readAccess"

def matchPendingOpExpected (got : Option PendingOpType) (expected : Option String) : Bool :=
  match got, expected with
  | none, none => true
  | some g, some e => pendingOpTypeToString g == e
  | _, _ => false

example :
    matchPendingOpExpected
      (pendingOpTypeForPath pendingOp0_pathname pendingOp0_search)
      pendingOp0_expected := by
  native_decide

example :
    matchPendingOpExpected
      (pendingOpTypeForPath pendingOp1_pathname pendingOp1_search)
      pendingOp1_expected := by
  native_decide

example :
    matchPendingOpExpected
      (pendingOpTypeForPath pendingOp2_pathname pendingOp2_search)
      pendingOp2_expected := by
  native_decide

example :
    matchPendingOpExpected
      (pendingOpTypeForPath pendingOp3_pathname pendingOp3_search)
      pendingOp3_expected := by
  native_decide

example : isReadProtectedPath "/api/wallet/balance" = true := by native_decide
example : isReadProtectedPath "/api/health" = false := by native_decide

end ArkWallet.Tests.WebAuthn
