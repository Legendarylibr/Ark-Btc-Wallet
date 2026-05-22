namespace ArkWallet.Crypto

def isHexDigit (c : Char) : Bool :=
  (c ≥ '0' && c ≤ '9') ||
  (c ≥ 'a' && c ≤ 'f') ||
  (c ≥ 'A' && c ≤ 'F')

def isUuidSegment (s : String) (len : Nat) : Bool :=
  s.length = len && s.all fun c => isHexDigit c

/-- UUID v4 nonce shape (mirrors `isValidNonceUuid` in `nonce-format.ts`). -/
def isValidNonceUuid (nonce : String) : Bool :=
  let parts := nonce.splitOn "-"
  match parts with
  | [a, b, c, d, e] =>
    isUuidSegment a 8 &&
    isUuidSegment b 4 &&
    isUuidSegment c 4 &&
    (c.length = 4 && c.get! 0 ∈ ['1', '2', '3', '4', '5']) &&
    isUuidSegment (c.drop 1) 3 &&
    isUuidSegment d 4 &&
    (d.length = 4 && (d.get! 0 = '8' || d.get! 0 = '9' || d.get! 0 = 'a' || d.get! 0 = 'b' ||
      d.get! 0 = 'A' || d.get! 0 = 'B')) &&
    isUuidSegment (d.drop 1) 3 &&
    isUuidSegment e 12
  | _ => false

end ArkWallet.Crypto
