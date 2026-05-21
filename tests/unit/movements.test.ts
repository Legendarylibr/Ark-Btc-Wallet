import { describe, expect, it } from "vitest";
import type { Movement } from "@/lib/barkd";
import { movementLabel } from "@/lib/movements";

function baseMovement(overrides: Partial<Movement>): Movement {
  return {
    id: 1,
    status: "successful",
    subsystem: { name: "arkoor", kind: "send" },
    intended_balance_sat: 0,
    effective_balance_sat: -1000,
    offchain_fee_sat: 10,
    sent_to: [{ destination: "ark1sender", amount_sat: 1000 }],
    received_on: [],
    input_vtxos: [],
    output_vtxos: [],
    exited_vtxos: [],
    time: {
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    ...overrides,
  };
}

describe("movementLabel", () => {
  it("labels refresh movements", () => {
    const m = baseMovement({
      subsystem: { name: "refresh", kind: "refresh" },
      effective_balance_sat: 0,
    });
    const label = movementLabel(m);
    expect(label.title).toMatch(/Secured/i);
    expect(label.subtitle).toContain("VTXO");
  });

  it("labels incoming receive", () => {
    const m = baseMovement({
      subsystem: { name: "mailbox", kind: "receive" },
      effective_balance_sat: 5000,
      sent_to: [],
      received_on: [{ destination: "ark1me", amount_sat: 5000 }],
      metadata: { sender: "ark1fromfriend" },
    });
    const label = movementLabel(m);
    expect(label.incoming).toBe(true);
    expect(label.showAmount).toBe(true);
  });

  it("labels outgoing send", () => {
    const m = baseMovement({
      subsystem: { name: "arkoor", kind: "send" },
      effective_balance_sat: -2000,
    });
    const label = movementLabel(m);
    expect(label.incoming).toBe(false);
  });
});
