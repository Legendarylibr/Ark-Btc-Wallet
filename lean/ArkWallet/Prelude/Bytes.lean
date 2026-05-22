namespace ArkWallet.Prelude

/-- Model of `constantTimeEqual` on equal-length byte lists. -/
def constantTimeEqual (a b : List Nat) : Bool :=
  a.length == b.length &&
    (a.zip b).all fun (x, y) => decide (x = y)

def constantTimeEqualString (a b : String) : Bool :=
  a == b

end ArkWallet.Prelude
