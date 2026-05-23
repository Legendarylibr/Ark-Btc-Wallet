import ArkWallet.Crypto.FileLock

namespace ArkWallet.Crypto

/--
  Encrypted envelope persistence (`src/lib/encrypted-file.ts`).
  `mutateEncryptedFile` runs inside `withFileLockSync` on the target path.
-/
structure EncryptedFileState where
  contents : List (String × String)  -- path → JSON envelope
  locks : LockTable
  deriving Inhabited

def readEncrypted (state : EncryptedFileState) (path : String) : Option String :=
  (state.contents.find? fun (p, _) => p == path).map (·.2)

def writeEncrypted (state : EncryptedFileState) (path data : String) : EncryptedFileState :=
  { state with
    contents := (path, data) :: state.contents.filter fun (p, _) => p ≠ path }

def mutateEncryptedFile (state : EncryptedFileState) (path : String)
    (mutator : String → String) : Option EncryptedFileState :=
  match tryAcquireLock state.locks path with
  | none => none
  | some held =>
    let st := { state with locks := held }
    let current := readEncrypted st path |>.getD "{}"
    let next := mutator current
    let written := writeEncrypted st path next
    some { contents := written.contents, locks := releaseLock held path }

end ArkWallet.Crypto
