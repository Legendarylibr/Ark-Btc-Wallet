import ArkWallet.WebAuthn.PendingOpPaths

namespace ArkWallet.WebAuthn

open PendingOpType

structure PendingOperation where
  fingerprint : String
  type : PendingOpType
  bodyHash : String
  creatorPublicKeyB64 : String
  exp : Nat

structure PendingOpStore where
  ops : List (String × PendingOperation)
  deriving Inhabited

def PendingOpStore.get (store : PendingOpStore) (opId : String) (now : Nat) : Option PendingOperation :=
  match store.ops.find? fun (id, _) => id == opId with
  | none => none
  | some (_, op) => if now > op.exp then none else some op

def createPendingOp (store : PendingOpStore) (opId fingerprint : String)
    (ty : PendingOpType) (bodyHash creatorPublicKeyB64 : String) (now ttl : Nat) :
    PendingOpStore :=
  { ops := (opId, {
      fingerprint := fingerprint
      type := ty
      bodyHash := bodyHash
      creatorPublicKeyB64 := creatorPublicKeyB64
      exp := now + ttl
    }) :: store.ops }

def matchesPendingOp (store : PendingOpStore) (opId fingerprint : String)
    (ty : PendingOpType) (bodyHash : String) (now : Nat) : Bool :=
  match store.get opId now with
  | none => false
  | some op =>
    op.fingerprint == fingerprint && op.type == ty && op.bodyHash == bodyHash

def consumePendingOp (store : PendingOpStore) (opId fingerprint : String)
    (ty : PendingOpType) (bodyHash : String) (now : Nat) : Option PendingOpStore :=
  if !matchesPendingOp store opId fingerprint ty bodyHash now then
    none
  else
    some { ops := store.ops.filter fun (id, _) => id ≠ opId }

end ArkWallet.WebAuthn
