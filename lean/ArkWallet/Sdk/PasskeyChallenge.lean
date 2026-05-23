namespace ArkWallet.Sdk

/--
  SDK passkey sensitive-op challenge (`src/sdk/webauthn/challenges.ts`).
  Separate trust model — client-only WebAuthn; not refinement of server routes.
-/
def sdkPasskeyOpPayload (walletId opId bodyHash : String) : String :=
  "sdk-passkey-op\nv1\n" ++ walletId ++ "\n" ++ opId ++ "\n" ++ bodyHash

/-- SHA-256 of payload is axiomatized in refinement; model uses payload string. -/
def sdkPasskeyOpChallenge (walletId opId bodyHash : String) : String :=
  sdkPasskeyOpPayload walletId opId bodyHash

example : sdkPasskeyOpChallenge "w" "op" "h" == sdkPasskeyOpChallenge "w" "op" "h" := rfl

example : sdkPasskeyOpChallenge "w" "op" "h1" ≠ sdkPasskeyOpChallenge "w" "op" "h2" := by
  native_decide

end ArkWallet.Sdk
