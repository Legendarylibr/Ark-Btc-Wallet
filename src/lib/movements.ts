import type { Movement } from "@/lib/barkd";
import { truncateAddress } from "@/lib/utils";

function metaString(m: Movement, ...keys: string[]): string | null {
  if (!m.metadata || typeof m.metadata !== "object") return null;
  for (const key of keys) {
    const v = m.metadata[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

export function movementLabel(m: Movement): {
  title: string;
  subtitle: string;
  incoming: boolean;
  showAmount: boolean;
} {
  const kind = m.subsystem.kind.toLowerCase();
  const failed = m.status === "failed" || m.status === "canceled";
  const pending = m.status === "pending";

  if (kind.includes("refresh")) {
    return {
      title: pending ? "Securing…" : failed ? "Secure failed" : "Secured",
      subtitle: "VTXO refresh",
      incoming: false,
      showAmount: m.status === "successful",
    };
  }

  const incoming =
    kind.includes("receive") ||
    (m.effective_balance_sat > 0 && !kind.includes("send"));

  if (incoming) {
    const from =
      metaString(m, "sender", "from", "counterparty", "ark_address") ??
      m.sent_to[0]?.destination ??
      m.received_on[0]?.destination;
    return {
      title: pending ? "Receiving…" : failed ? "Receive failed" : "Received",
      subtitle: from ? truncateAddress(from) : "Ark payment",
      incoming: true,
      showAmount: !failed,
    };
  }

  const to =
    metaString(m, "destination", "to", "ark_address") ??
    m.sent_to[0]?.destination;
  return {
    title: pending ? "Sending…" : failed ? "Send failed" : "Sent",
    subtitle: to ? truncateAddress(to) : "Ark payment",
    incoming: false,
    showAmount: !failed,
  };
}

export function statusBadge(
  status: Movement["status"],
): { label: string; className: string } | null {
  switch (status) {
    case "pending":
      return { label: "Pending", className: "text-amber-400" };
    case "failed":
      return { label: "Failed", className: "text-red-400" };
    case "canceled":
      return { label: "Canceled", className: "text-cash-muted" };
    default:
      return null;
  }
}
