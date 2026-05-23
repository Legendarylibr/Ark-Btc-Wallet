namespace ArkWallet.Crypto

/--
  Cross-process exclusive lock (`src/lib/file-lock.ts`).
  Model: at most one `withFileLockSync` critical section per file path.
-/
structure LockTable where
  held : List String
  deriving Inhabited, DecidableEq, Repr

def tryAcquireLock (table : LockTable) (path : String) : Option LockTable :=
  if table.held.contains path then none
  else some { held := path :: table.held }

def releaseLock (table : LockTable) (path : String) : LockTable :=
  { held := table.held.filter fun p => p ≠ path }

/-- Locked mutation: acquire → fn → release (no nested hold on same path). -/
def withFileLock (table : LockTable) (path : String) (fn : LockTable → Option LockTable) :
    Option LockTable :=
  match tryAcquireLock table path with
  | none => none
  | some acquired =>
    match fn acquired with
    | none => none
    | some mid => some (releaseLock mid path)

end ArkWallet.Crypto
