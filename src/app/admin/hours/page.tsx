import type { ReactNode } from "react";
import { asc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { availabilityExceptions, availabilityRules, barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/fields";
import { MutationForm } from "@/components/ui/MutationForm";
import {
  addTimeOffAction,
  removeTimeOffAction,
  saveWeeklyHoursAction,
} from "@/domain/admin/actions";
import { todayInShopTz, loadSettings } from "@/domain/booking/load";
import { HoursEditor } from "./HoursEditor";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtMin(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

export default async function AdminHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  const allBarbers = await db.select().from(barbers).where(eq(barbers.active, true));
  if (allBarbers.length === 0) {
    return (
      <PageShell title="Hours">
        <EmptyState title="No barbers yet" hint="Seed the database or add a barber row." />
      </PageShell>
    );
  }
  const barber = allBarbers.find((b) => b.id === query.barber) ?? allBarbers[0]!;

  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.barberId, barber.id));

  const settings = await loadSettings();
  const today = todayInShopTz(settings.timezone);
  const timeOff = await db
    .select()
    .from(availabilityExceptions)
    .where(gte(availabilityExceptions.date, today))
    .orderBy(asc(availabilityExceptions.date));

  // Current weekly template as "H:MM-H:MM" per weekday for the editor.
  const weekly: string[] = WEEKDAYS.map((_, weekday) => {
    const rule = rules.find((r) => r.weekday === weekday);
    return rule ? `${fmtMin(rule.startMin)}-${fmtMin(rule.endMin)}` : "";
  });

  return (
    <PageShell title="Hours" subtitle={`Weekly schedule for ${barber.displayName}`}>
      <Card title="Weekly hours">
        <HoursEditor
          barberId={barber.id}
          weekdays={WEEKDAYS}
          initial={weekly}
          action={saveWeeklyHoursAction}
        />
      </Card>

      <Card title="Time off">
        <div style={{ display: "grid", gap: 16 }}>
          <MutationForm
            action={addTimeOffAction}
            submitLabel="Add day off"
            hidden={{ barberId: barber.id }}
          >
            <Field label="Date">
              <TextInput name="date" type="date" required />
            </Field>
          </MutationForm>

          {timeOff.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Kind</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {timeOff.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.date}</td>
                    <td style={{ color: "var(--muted)" }}>{t.kind === "off" ? "day off" : "custom hours"}</td>
                    <td style={{ textAlign: "right" }}>
                      <MutationForm
                        action={removeTimeOffAction}
                        submitLabel="Remove"
                        variant="danger"
                        hidden={{ id: t.id }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
