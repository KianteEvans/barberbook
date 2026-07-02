import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membershipCredits, membershipPlans, memberships, users } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState, type BadgeTone } from "@/components/ui/primitives";
import { Field, TextInput, TextArea } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { upsertPlanAction } from "@/domain/memberships/actions";
import { creditsAvailable } from "@/domain/memberships/credits";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

const statusTone: Record<string, BadgeTone> = {
  active: "ok",
  past_due: "warn",
  canceled: "neutral",
};

function PlanFields({
  defaults,
}: {
  defaults?: {
    name: string;
    description: string | null;
    creditsPerPeriod: number;
    priceCents: number;
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
      <Field label="Cuts per month">
        <TextInput
          name="creditsPerPeriod"
          type="number"
          min={1}
          required
          defaultValue={String(defaults?.creditsPerPeriod ?? 2)}
        />
      </Field>
      <Field label="Monthly price (cents)">
        <TextInput
          name="priceCents"
          type="number"
          min={0}
          step={100}
          required
          defaultValue={String(defaults?.priceCents ?? 6000)}
        />
      </Field>
    </>
  );
}

export default async function AdminMembershipsPage(): Promise<ReactNode> {
  const plans = await db
    .select()
    .from(membershipPlans)
    .orderBy(desc(membershipPlans.createdAt));

  const subs = await db
    .select({
      id: memberships.id,
      status: memberships.status,
      currentPeriodEnd: memberships.currentPeriodEnd,
      clientName: users.name,
      clientEmail: users.email,
      planName: membershipPlans.name,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.clientId, users.id))
    .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
    .orderBy(desc(memberships.createdAt));

  const allCredits = await db.select().from(membershipCredits);
  const now = new Date();
  const creditsFor = (membershipId: string): number =>
    creditsAvailable(
      allCredits.filter((c) => c.membershipId === membershipId),
      now,
    );

  return (
    <PageShell
      title="Memberships"
      subtitle="Plans and subscribers"
      action={
        <FormDrawer
          trigger="Add plan"
          title="Add membership plan"
          action={upsertPlanAction}
          submitLabel="Create"
        >
          <PlanFields />
        </FormDrawer>
      }
    >
      <Card title="Plans">
        {plans.length === 0 ? (
          <EmptyState title="No plans yet" hint="Add a plan to open memberships." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Cuts / month</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th>Stripe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.creditsPerPeriod}</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(p.priceCents)}/mo</td>
                  <td>
                    <Badge tone={p.stripePriceId ? "ok" : "neutral"}>
                      {p.stripePriceId ? "synced" : "not synced"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <FormDrawer
                      trigger="Edit"
                      title={`Edit ${p.name}`}
                      action={upsertPlanAction}
                      submitLabel="Save"
                      variant="secondary"
                      hidden={{ id: p.id }}
                    >
                      <PlanFields defaults={p} />
                    </FormDrawer>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Subscribers">
        {subs.length === 0 ? (
          <EmptyState
            title="No subscribers yet"
            hint="Members appear here after their first paid invoice."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Credits left</th>
                <th>Renews</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>
                    {s.clientName}
                    <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                      {" "}
                      ({s.clientEmail})
                    </span>
                  </td>
                  <td>{s.planName}</td>
                  <td>
                    <Badge tone={statusTone[s.status] ?? "neutral"}>
                      {s.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td>{creditsFor(s.id)}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {s.currentPeriodEnd
                      ? s.currentPeriodEnd.toLocaleDateString("en-US")
                      : "-"}
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
