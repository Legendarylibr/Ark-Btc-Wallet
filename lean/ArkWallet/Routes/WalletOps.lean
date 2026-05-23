import ArkWallet.Routes.RouteId
import ArkWallet.WebAuthn.HardwareFresh
import ArkWallet.WebAuthn.PendingOpPaths

namespace ArkWallet.Routes

open ArkWallet.Auth
open ArkWallet.WebAuthn

/-- Wallet operation guard templates (`api-guard*.ts`). -/
inductive WalletGuardKind
  | cryptoOnly
  | readCrypto
  | sensitiveCrypto
  deriving Repr

def walletGuardKind (route : RouteId) : Option WalletGuardKind :=
  match route with
  | .walletSync => some .readCrypto
  | .walletBalance | .walletHistory => some .readCrypto
  | .walletAddress => some .readCrypto
  | .walletSend | .walletSendEstimate | .walletRefresh => some .sensitiveCrypto
  | _ => none

def readRouteNeedsHardwareFresh (route : RouteId) (store : SessionStore) (sessionId : String)
    (now : Nat) : Bool :=
  match route with
  | .walletBalance | .walletHistory | .walletAddress | .walletSync =>
    !isHardwareFreshForRead store sessionId now
  | _ => false

def sensitiveRouteNeedsPendingOp (route : RouteId) : Bool :=
  match route with
  | .walletSend | .walletSendEstimate | .walletRefresh | .walletAddress => true
  | _ => false

end ArkWallet.Routes
