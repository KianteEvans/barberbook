import type { ReactNode } from "react";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput, TextArea } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { upsertServiceAction } from "@/domain/admin/actions";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

function ServiceFields({
  defaults,
}: {
  defaults?: {
    name: string;
    description: string | null;
    durationMin: number;
    priceCents: number;
    depositCents: number | null;
  };
}): ReactNode {
  return (
    <>
      <Field label="Name">
        <TextInput name="name" required defaultValue={defaults?.name} />
      </Field>
      <Field label="Description">
        <TextArea name="description" rows={2} defaultValue={defaults?.description ?? ""} />
      </Field>
      <Field label="Duration (minutes)">
        <TextInput
          name="durationMin"
          type="number"
          min={5}
          step={5}
          required
          defaultValue={String(defaults?.durationMin ?? 30)}
        />
      </Field>
      <Field label="Price (cents)">
        <TextInput
          name="priceCents"
          type="number"
          min={0}
          step={50}
          required
          defaultValue={String(defaults?.priceCents ?? 3500)}
        />
      </Field>
      <Field label="Deposit (cents, blank = shop default)">
        <TextInput
          name="depositCents"
          type="number"
          min={0}
          step={50}
          defaultValue={defaults?.depositCents !== null && defaults?.depositCents !== undefined ? String(defaults.depositCents) : ""}
        />
      </Field>
    </>
  );
}

export default async function AdminServicesPage(): Promise<ReactNode> {
  const all = await db.select().from(services).orderBy(services.createdAt);

  return (
    <PageShell
      title="Services"
      subtitle="What clients can book, with pricing and deposits"
      action={
        <FormDrawer
          trigger="Add service"
          title="Add service"
          action={upsertServiceAction}
          submitLabel="Create"
        >
          <ServiceFields />
        </FormDrawer>
      }
    >
      <Card>
        {all.length === 0 ? (
          <EmptyState title="No services yet" hint="Add your first service to open bookings." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Duration</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Deposit</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {all.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: "var(--muted)" }}>{s.durationMin} min</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(s.priceCents)}</td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>
                    {s.depositCents !== null ? formatMoney(s.depositCents) : "shop default"}
                  </td>
                  <td>
                    <Badge tone={s.active ? "ok" : "neutral"}>
                      {s.active ? "active" : "hidden"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <FormDrawer
                      trigger="Edit"
                      title={`Edit ${s.name}`}
                      action={upsertServiceAction}
                      submitLabel="Save"
                      variant="secondary"
                      hidden={{ id: s.id, active: s.active ? "on" : "off" }}
                    >
                      <ServiceFields defaults={s} />
                    </FormDrawer>
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
