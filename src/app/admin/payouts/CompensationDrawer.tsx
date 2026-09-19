"use client";

import { useState, type ReactNode } from "react";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Field, TextInput, Select } from "@/components/ui/fields";
import { saveCompensationAction } from "@/domain/payroll/actions";

/**
 * Pay setup for one chair. Only the fields belonging to the chosen model are
 * shown - a stray percentage next to booth rent invites a payroll mistake.
 */
export function CompensationDrawer({
  barberId,
  barberName,
  compType,
  commissionPct,
  boothRentCents,
  boothRentPeriod,
  hourlyCents,
}: {
  barberId: string;
  barberName: string;
  compType: "none" | "commission" | "booth_rent" | "hourly";
  commissionPct: number | null;
  boothRentCents: number | null;
  boothRentPeriod: "weekly" | "monthly" | null;
  hourlyCents: number | null;
}): ReactNode {
  const [type, setType] = useState(compType);

  return (
    <FormDrawer
      trigger="Pay setup"
      title={`How ${barberName} gets paid`}
      action={saveCompensationAction}
      submitLabel="Save"
      variant="secondary"
      hidden={{ barberId }}
    >
      <Field label="Pay model">
        <select
          name="compType"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="control"
          style={{
            width: "100%",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "var(--text)",
          }}
        >
          <option value="none">Not set</option>
          <option value="commission">Commission (a share of what they sell)</option>
          <option value="booth_rent">Booth rent (they keep their money, pay rent)</option>
          <option value="hourly">Hourly</option>
        </select>
      </Field>

      {type === "commission" && (
        <Field label="Commission (%)">
          <TextInput
            name="commissionPct"
            type="number"
            min={0}
            max={100}
            defaultValue={String(commissionPct ?? 60)}
          />
        </Field>
      )}

      {type === "booth_rent" && (
        <>
          <Field label="Rent ($)">
            <TextInput
              name="boothRentDollars"
              type="number"
              min={0}
              step="0.01"
              defaultValue={((boothRentCents ?? 0) / 100).toFixed(2)}
            />
          </Field>
          <Field label="Charged">
            <Select name="boothRentPeriod" defaultValue={boothRentPeriod ?? "weekly"}>
              <option value="weekly">Per week</option>
              <option value="monthly">Per month</option>
            </Select>
          </Field>
        </>
      )}

      {type === "hourly" && (
        <Field label="Rate ($/hour)">
          <TextInput
            name="hourlyDollars"
            type="number"
            min={0}
            step="0.01"
            defaultValue={((hourlyCents ?? 0) / 100).toFixed(2)}
          />
        </Field>
      )}

      <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
        Card tips are paid out with the period. Cash tips are reported but not
        paid again - the barber already has them.
      </p>
    </FormDrawer>
  );
}
