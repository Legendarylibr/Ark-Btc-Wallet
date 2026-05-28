import ArkWallet.Routes.RouteId

namespace ArkWallet.Routes

/-- Guard layers applied to each API route (barkd mode). -/
structure RouteGuards where
  apiSecurity : Bool := true
  rateLimit : Bool := false
  sessionCookie : Bool := false
  ed25519Verify : Bool := false
  preSessionAllowed : Bool := false
  webauthnHardware : Bool := false
  pendingOpCreatorSig : Bool := false
  readCryptoGuard : Bool := false
  sensitiveCryptoGuard : Bool := false
  setupToken : Bool := false
  unlockToken : Bool := false
  uniform401 : Bool := false
  deriving Repr

def guardsFor : RouteId → RouteGuards
  | .health =>
    { apiSecurity := true }
  | .authChallenge =>
    { apiSecurity := true, rateLimit := true }
  | .authRegister =>
    { apiSecurity := true, rateLimit := true, webauthnHardware := true }
  | .authUnlockCheck =>
    { apiSecurity := true, rateLimit := true }
  | .authUnlockFailed =>
    { apiSecurity := true, unlockToken := true }
  | .authBarkdReady =>
    { apiSecurity := true, preSessionAllowed := true, unlockToken := true }
  | .authLogout =>
    { apiSecurity := true }
  | .webauthnStatus =>
    { apiSecurity := true, rateLimit := true }
  | .webauthnSetupChallenge =>
    { apiSecurity := true, rateLimit := true }
  | .webauthnSetupProof =>
    { apiSecurity := true, rateLimit := true, preSessionAllowed := true }
  | .webauthnRegisterOptions =>
    { apiSecurity := true, rateLimit := true, setupToken := true, uniform401 := true }
  | .webauthnRegisterVerify =>
    { apiSecurity := true, rateLimit := true, setupToken := true, uniform401 := true }
  | .webauthnAuthOptions =>
    { apiSecurity := true, rateLimit := true, pendingOpCreatorSig := true, uniform401 := true }
  | .webauthnPendingOp =>
    { apiSecurity := true, rateLimit := true, preSessionAllowed := true,
      ed25519Verify := true }
  | .walletBalance =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      readCryptoGuard := true }
  | .walletHistory =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      readCryptoGuard := true }
  | .walletAddress =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      readCryptoGuard := true, sensitiveCryptoGuard := true }
  | .walletSend =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      sensitiveCryptoGuard := true, webauthnHardware := true }
  | .walletSendEstimate =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true }
  | .walletRefresh =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      sensitiveCryptoGuard := true, webauthnHardware := true }
  | .walletSync =>
    { apiSecurity := true, sessionCookie := true, ed25519Verify := true,
      readCryptoGuard := true }
  | .walletReadyDeprecated =>
    { apiSecurity := true }

def allRoutes : List RouteId :=
  [.health, .authChallenge, .authRegister, .authUnlockCheck, .authUnlockFailed,
   .authBarkdReady, .authLogout, .webauthnStatus, .webauthnSetupChallenge,
   .webauthnSetupProof, .webauthnRegisterOptions, .webauthnRegisterVerify,
   .webauthnAuthOptions, .webauthnPendingOp, .walletBalance, .walletHistory,
   .walletAddress, .walletSend, .walletSendEstimate, .walletRefresh,
   .walletSync, .walletReadyDeprecated]

end ArkWallet.Routes
