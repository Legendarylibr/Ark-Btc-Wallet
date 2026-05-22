namespace ArkWallet.Crypto

/-- Mirrors `challengeMessage` in `challenge-messages.ts`. -/
def challengeMessage (challenge : String) : String :=
  "wallet-register\n" ++ challenge

/-- Mirrors `webauthnSetupMessage`. -/
def webauthnSetupMessage (challenge : String) : String :=
  "wallet-webauthn-setup\n" ++ challenge

end ArkWallet.Crypto
