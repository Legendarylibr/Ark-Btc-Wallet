namespace ArkWallet.WebAuthn

inductive PendingOpType
  | send
  | refresh
  | rotateAddress
  | sessionRegister
  | readAccess
  deriving Repr, BEq

def readProtectedPaths : List String :=
  ["/api/wallet/balance", "/api/wallet/history", "/api/wallet/address"]

def readCryptoPostPaths : List String :=
  ["/api/wallet/sync"]

def isReadProtectedPath (pathname : String) : Bool :=
  readProtectedPaths.contains pathname

def isReadCryptoPostPath (pathname : String) : Bool :=
  readCryptoPostPaths.contains pathname

/-- Mirrors `pendingOpTypeForPath` in `pending-op-paths.ts`. -/
def pendingOpTypeForPath (pathname search : String) : Option PendingOpType :=
  if pathname.endsWith "/send/estimate" then
    none
  else if pathname.endsWith "/send" then
    some .send
  else if pathname.endsWith "/refresh" then
    some .refresh
  else if (pathname.splitOn "/address").length > 1 && (search.splitOn "rotate=1").length > 1 then
    some .rotateAddress
  else
    none

end ArkWallet.WebAuthn
