namespace ArkWallet.WebAuthn

/-- Uniform setup errors (`setup-gate.ts`) — single constructor per message. -/
structure SetupError where
  message : String

def setupVaultProofRequired : SetupError :=
  ⟨"Vault proof required — sign the setup challenge with your passphrase key first"⟩

def setupProofIncomplete : SetupError :=
  ⟨"Setup proof could not be completed — check barkd and try again"⟩

def setupCannotContinue : SetupError :=
  ⟨"Hardware setup cannot continue — restart from the app"⟩

def hardwareAuthUnavailable : SetupError :=
  ⟨"Hardware confirmation is not available — start the action again from the app"⟩

def pendingOpUnavailable : SetupError :=
  ⟨"Operation confirmation is not available — start the action again from the app"⟩

end ArkWallet.WebAuthn
