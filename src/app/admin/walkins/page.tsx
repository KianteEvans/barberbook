import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { db } from "@/db/client";
import { barbers, services } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput, Select } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { WalkinResolve } from "@/components/ui/WalkinResolve";
import { addWalkinAction } from "@/domain/walkins/actions";
import { loadWalkinQueue } from "@/domain/walkins/operations";
import { loadSettings } from "@/domain/booking/load";
import { StartWalkin } from "./StartWalkin";

export const dynamic = "force-dynamic";

export default async function AdminWalkinsPage(): Promise<ReactNode> {
  const queue = await loadWalkinQueue();
  const settings = await loadSettings();
  const barberOptions = await db
    .select({ id: barbers.id, name: barbers.displayName })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.displayName));
  const serviceOptions = await db
    .select({ id: services.id, name: services.name })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.name));

  return (
    <PageShell
      title="Walk-ins"
      subtitle="Today's in-shop line - foot traffic, no account needed"
      action={
        <FormDrawer
          trigger="Add walk-in"
          title="Add walk-in"
          action={addWalkinAction}
          submitLabel="Add to line"
        >
          <Field label="Name">
            <TextInput name="name" required placeholder="First name is fine" />
          </Field>
          <Field label="Phone (optional - we text them when they're up)">
            <TextInput name="phone" placeholder="555-010-0123" />
          </Field>
          <Field label="Service (optional)">
            <Select name="serviceId" defaultValue="">
              <option value="">Not sure yet</option>
              {serviceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chair">
            <Select name="barberId" defaultValue="">
              <option value="">First available</option>
              {barberOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormDrawer>
      }
    >
      <Card>
        {queue.length === 0 ? (
          <EmptyState
            title="Nobody in the line"
            hint="Add walk-ins as they come through the door."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Service</th>
                <th>Chair</th>
                <th>Arrived</th>
                <th>Est. wait</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {queue.map((w) => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{w.name}</td>
                  <td style={{ color: "var(--muted)" }}>{w.serviceName ?? "-"}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {w.barberName ?? "First available"}
                  </td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {format(toZonedTime(w.createdAt, settings.timezone), "h:mm a")}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {w.status === "waiting" ? `~${w.estWaitMin} min` : "-"}
                  </td>
                  <td>
                    <Badge tone={w.status === "serving" ? "ok" : "warn"}>
                      {w.status === "serving" ? "in the chair" : "waiting"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {w.status === "waiting" && (
                        <StartWalkin
                          id={w.id}
                          barberOptions={barberOptions}
                          defaultBarberId={w.barberId}
                        />
                      )}
                      <WalkinResolve id={w.id} status={w.status as "waiting" | "serving"} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
