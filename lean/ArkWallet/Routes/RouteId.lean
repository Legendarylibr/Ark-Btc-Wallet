namespace ArkWallet.Routes

/-- All `src/app/api/**/route.ts` handlers (barkd mode catalog). -/
inductive RouteId
  | health
  | authChallenge
  | authRegister
  | authUnlockCheck
  | authUnlockFailed
  | authBarkdReady
  | authLogout
  | webauthnStatus
  | webauthnSetupChallenge
  | webauthnSetupProof
  | webauthnRegisterOptions
  | webauthnRegisterVerify
  | webauthnAuthOptions
  | webauthnPendingOp
  | walletBalance
  | walletHistory
  | walletAddress
  | walletSend
  | walletSendEstimate
  | walletRefresh
  | walletSync
  | walletReadyDeprecated
  deriving Decidable, Repr

def routePath : RouteId → String
  | .health => "/api/health"
  | .authChallenge => "/api/auth/challenge"
  | .authRegister => "/api/auth/register"
  | .authUnlockCheck => "/api/auth/unlock-check"
  | .authUnlockFailed => "/api/auth/unlock-failed"
  | .authBarkdReady => "/api/auth/barkd-ready"
  | .authLogout => "/api/auth/logout"
  | .webauthnStatus => "/api/auth/webauthn/status"
  | .webauthnSetupChallenge => "/api/auth/webauthn/setup-challenge"
  | .webauthnSetupProof => "/api/auth/webauthn/setup-proof"
  | .webauthnRegisterOptions => "/api/auth/webauthn/register-options"
  | .webauthnRegisterVerify => "/api/auth/webauthn/register-verify"
  | .webauthnAuthOptions => "/api/auth/webauthn/auth-options"
  | .webauthnPendingOp => "/api/auth/webauthn/pending-op"
  | .walletBalance => "/api/wallet/balance"
  | .walletHistory => "/api/wallet/history"
  | .walletAddress => "/api/wallet/address"
  | .walletSend => "/api/wallet/send"
  | .walletSendEstimate => "/api/wallet/send/estimate"
  | .walletRefresh => "/api/wallet/refresh"
  | .walletSync => "/api/wallet/sync"
  | .walletReadyDeprecated => "/api/wallet/ready"

def requiresSessionCookie : RouteId → Bool
  | .health => false
  | .authChallenge => false
  | .authRegister => false
  | .authUnlockCheck => false
  | .authUnlockFailed => false
  | .authBarkdReady => false
  | .authLogout => true
  | .webauthnStatus => false
  | .webauthnSetupChallenge => false
  | .webauthnSetupProof => false
  | .webauthnRegisterOptions => false
  | .webauthnRegisterVerify => false
  | .webauthnAuthOptions => false
  | .webauthnPendingOp => true
  | .walletBalance => true
  | .walletHistory => true
  | .walletAddress => true
  | .walletSend => true
  | .walletSendEstimate => true
  | .walletRefresh => true
  | .walletSync => true
  | .walletReadyDeprecated => false

def deprecatedAlways410 : RouteId → Bool
  | .walletReadyDeprecated => true
  | _ => false

end ArkWallet.Routes
