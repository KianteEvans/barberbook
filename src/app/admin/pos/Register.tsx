"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { Field } from "@/components/ui/fields";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";
import { cartTotals, tipForPercent, type CartLine } from "@/domain/pos/cart";
import { createSaleAction } from "@/domain/pos/actions";

interface Option {
  readonly id: string;
  readonly name: string;
  readonly priceCents?: number;
}

/**
 * The register. Cart state lives here; every number shown comes from the same
 * pure `cartTotals` the server re-computes, so the screen and the ledger agree.
 */
export function Register({
  services,
  barbers,
  clients,
  fixedBarberId,
}: {
  services: Option[];
  barbers: Option[];
  clients: Option[];
  /** Set for a barber ringing up their own chair - hides the chair picker. */
  fixedBarberId?: string;
}): ReactNode {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discountDollars, setDiscountDollars] = useState("");
  const [tipDollars, setTipDollars] = useState("");
  const [tender, setTender] = useState<"cash" | "card" | "other">("cash");
  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState(fixedBarberId ?? "");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const toCents = (v: string): number => Math.round((Number(v) || 0) * 100);
  const totals = cartTotals(lines, {
    discountCents: toCents(discountDollars),
    tipCents: toCents(tipDollars),
  });

  const addService = (id: string): void => {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setLines((prev) => {
      const at = prev.findIndex((l) => l.serviceId === id);
      if (at >= 0) {
        const next = [...prev];
        next[at] = { ...next[at]!, qty: next[at]!.qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          kind: "service",
          name: s.name,
          unitPriceCents: s.priceCents ?? 0,
          qty: 1,
          serviceId: id,
        },
      ];
    });
  };

  const addCustom = (): void => {
    const cents = toCents(customPrice);
    if (!customName.trim() || cents <= 0) return;
    setLines((prev) => [
      ...prev,
      { kind: "custom", name: customName.trim(), unitPriceCents: cents, qty: 1 },
    ]);
    setCustomName("");
    setCustomPrice("");
  };

  const bump = (i: number, by: number): void =>
    setLines((prev) =>
      prev
        .map((l, k) => (k === i ? { ...l, qty: l.qty + by } : l))
        .filter((l) => l.qty > 0),
    );

  const chip = (active: boolean) =>
    ({
      padding: "7px 14px",
      borderRadius: "var(--radius-full)",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent)" : "var(--panel-2)",
      color: active ? "var(--accent-ink)" : "var(--text)",
    }) as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <Card title="Add to the sale">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {services.map((s) => (
              <button key={s.id} type="button" style={chip(false)} onClick={() => addService(s.id)}>
                {s.name} {formatMoney(s.priceCents ?? 0)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "2 1 140px" }}>
              <Field label="Something else">
                <input
                  className="control"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Beard oil, line-up..."
                  style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                />
              </Field>
            </div>
            <div style={{ flex: "1 1 90px" }}>
              <Field label="Price">
                <input
                  className="control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                />
              </Field>
            </div>
            <button type="button" className="btn btn-secondary" style={{ ...chip(false), padding: "9px 14px" }} onClick={addCustom}>
              Add
            </button>
          </div>
        </div>
      </Card>

      <Card title={`Cart${lines.length > 0 ? ` (${lines.length})` : ""}`}>
        {lines.length === 0 ? (
          <EmptyState title="Nothing rung up yet" hint="Tap a service to start a sale." />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {lines.map((l, i) => (
              <div
                key={`${l.name}-${i}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}
              >
                <div style={{ display: "grid", gap: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    {formatMoney(l.unitPriceCents)} each
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button type="button" onClick={() => bump(i, -1)} style={chip(false)} aria-label={`One fewer ${l.name}`}>-</button>
                  <span style={{ fontWeight: 700, minWidth: 18, textAlign: "center" }}>{l.qty}</span>
                  <button type="button" onClick={() => bump(i, 1)} style={chip(false)} aria-label={`One more ${l.name}`}>+</button>
                  <span style={{ fontWeight: 700, minWidth: 66, textAlign: "right" }}>
                    {formatMoney(l.unitPriceCents * l.qty)}
                  </span>
                </div>
              </div>
            ))}

            <div style={{ display: "grid", gap: 6, paddingTop: 6 }}>
              <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />
              {totals.discountCents > 0 && (
                <Row label="Discount" value={`-${formatMoney(totals.discountCents)}`} />
              )}
              {totals.tipCents > 0 && <Row label="Tip" value={formatMoney(totals.tipCents)} />}
              <Row label="Total" value={formatMoney(totals.totalCents)} strong />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {[0, 15, 18, 20, 25].map((p) => (
                <button
                  key={p}
                  type="button"
                  style={chip(toCents(tipDollars) === tipForPercent(totals.netSalesCents, p) && (p > 0 || tipDollars === ""))}
                  onClick={() =>
                    setTipDollars(
                      p === 0 ? "" : (tipForPercent(totals.netSalesCents, p) / 100).toFixed(2),
                    )
                  }
                >
                  {p === 0 ? "No tip" : `${p}%`}
                </button>
              ))}
            </div>

            <MutationForm
              action={createSaleAction}
              submitLabel={`Take ${formatMoney(totals.totalCents)}`}
              successMessage="Sale complete."
              hidden={{
                lines: JSON.stringify(lines),
                tender,
                discountCents: String(toCents(discountDollars)),
                tipCents: String(toCents(tipDollars)),
                ...(barberId ? { barberId } : {}),
                ...(clientId ? { clientId } : {}),
              }}
              onSuccess={() => {
                setLines([]);
                setDiscountDollars("");
                setTipDollars("");
                setClientId("");
                router.refresh();
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <Field label="How are they paying?">
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["cash", "card", "other"] as const).map((t) => (
                      <button key={t} type="button" style={chip(tender === t)} onClick={() => setTender(t)}>
                        {t === "cash" ? "Cash" : t === "card" ? "Card" : "Other"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Discount ($)">
                  <input
                    className="control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountDollars}
                    onChange={(e) => setDiscountDollars(e.target.value)}
                    placeholder="0.00"
                    style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                  />
                </Field>
                <Field label="Tip ($)">
                  <input
                    className="control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipDollars}
                    onChange={(e) => setTipDollars(e.target.value)}
                    placeholder="0.00"
                    style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                  />
                </Field>
                {!fixedBarberId && (
                  <Field label="Which chair?">
                    <select
                      value={barberId}
                      onChange={(e) => setBarberId(e.target.value)}
                      className="control"
                      style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                    >
                      <option value="">No chair</option>
                      {barbers.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Client (optional)">
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="control"
                    style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text)" }}
                  >
                    <option value="">Walk-up</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </MutationForm>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }): ReactNode {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: strong ? 16 : 13, fontWeight: strong ? 800 : 500 }}>
      <span style={{ color: strong ? "var(--text)" : "var(--muted)" }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
