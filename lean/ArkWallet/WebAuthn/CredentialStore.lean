import ArkWallet.Crypto.EncryptedFile

namespace ArkWallet.WebAuthn

structure StoredCredential where
  credentialId : String
  publicKey : String
  counter : Nat
  deriving Inhabited

structure CredentialStore where
  credentials : List (String × StoredCredential)  -- fingerprint → cred
  deriving Inhabited

def CredentialStore.get (store : CredentialStore) (fingerprint : String) :
    Option StoredCredential :=
  (store.credentials.find? fun (fp, _) => fp == fingerprint).map (·.2)

def saveCredential (store : CredentialStore) (fingerprint : String) (cred : StoredCredential) :
    Option CredentialStore :=
  if store.credentials.any fun (fp, _) => fp == fingerprint then none
  else some { credentials := (fingerprint, cred) :: store.credentials }

/-- Monotonic counter update (`webauthn/store.ts`). -/
def updateCounter (store : CredentialStore) (fingerprint : String) (newCounter : Nat) :
    CredentialStore :=
  { credentials := store.credentials.map fun (fp, c) =>
      if fp == fingerprint && newCounter > c.counter then
        (fp, { c with counter := newCounter })
      else
        (fp, c) }

/-- Reload from disk wins when disk counter is higher (multi-worker sync). -/
def syncFromDisk (memory disk : CredentialStore) (fingerprint : String) : CredentialStore :=
  match memory.get fingerprint, disk.get fingerprint with
  | some m, some d =>
    if d.counter > m.counter then updateCounter memory fingerprint d.counter else memory
  | none, some d =>
    { credentials := (fingerprint, d) :: memory.credentials }
  | _, _ => memory

end ArkWallet.WebAuthn
