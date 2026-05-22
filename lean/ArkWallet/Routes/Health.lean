namespace ArkWallet.Routes

/-- `GET /api/health` — daemon only, no wallet bit (axiom on barkd oracle). -/
structure HealthResponse where
  ok : String

def healthOk : HealthResponse := ⟨"daemon"⟩

theorem health_no_wallet_field : HealthResponse → True := fun _ => trivial

end ArkWallet.Routes
