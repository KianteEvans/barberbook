"use client";

import { useState, type ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import { saveBarberServicesAction } from "@/domain/barbers/actions";

export interface OfferingOption {
  readonly serviceId: string;
  readonly name: string;
  readonly shopPriceLabel: string;
  readonly offered: boolean;
  /** Override in cents as a string, "" = shop price. */
  readonly overrideCents: string;
}

interface RowState {
  offered: boolean;
  override: string;
}

/**
 * Per-barber service assignment: checkbox = offered, optional price-cents
 * override (blank = shop price). Packed into one pipe-encoded hidden field
 * ("serviceId=cents|serviceId=|...") like the HoursEditor.
 */
export function OfferingsEditor({
  barberId,
  options,
}: {
  barberId: string;
  options: OfferingOption[];
}): ReactNode {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      options.map((o) => [
        o.serviceId,
        { offered: o.offered, override: o.overrideCents },
      ]),
    ),
  );

  const encoded = options
    .filter((o) => rows[o.serviceId]?.offered)
    .map((o) => `${o.serviceId}=${rows[o.serviceId]?.override.trim() ?? ""}`)
    .join("|");

  const update = (serviceId: string, patch: Partial<RowState>): void =>
    setRows((cur) => ({
      ...cur,
      [serviceId]: { offered: false, override: "", ...cur[serviceId], ...patch },
    }));

  return (
    <MutationForm
      action={saveBarberServicesAction}
      submitLabel="Save services"
      successMessage="Services updated."
      hidden={{ barberId, offerings: encoded }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        {options.map((o) => {
          const row = rows[o.serviceId] ?? { offered: false, override: "" };
          return (
            <div
              key={o.serviceId}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 150px",
                alignItems: "center",
                gap: 10,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={row.offered}
                  onChange={(e) => update(o.serviceId, { offered: e.target.checked })}
                />
                {o.name}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  (shop {o.shopPriceLabel})
                </span>
              </label>
              <input
                value={row.override}
                onChange={(e) =>
                  update(o.serviceId, {
                    override: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="cents (blank = shop)"
                disabled={!row.offered}
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  color: "var(--text)",
                  opacity: row.offered ? 1 : 0.4,
                }}
              />
            </div>
          );
        })}
      </div>
    </MutationForm>
  );
}
