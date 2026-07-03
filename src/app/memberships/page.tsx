import type { ReactNode } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { membershipPlans } from "@/db/schema";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { loadClientMembership } from "@/domain/memberships/operations";
import { formatMoney } from "@/domain/money";
import { paymentsEnabled } from "@/env";
import { SubscribeButton } from "./SubscribeButton";

export const dynamic = "force-dynamic";

export default async function MembershipsPage(): Promise<ReactNode> {
  const identity = await tryGetIdentity();
  const plans = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.active, true));
  const current = identity ? await loadClientMembership(identity.userId) : null;

  return (
    <PageShell
      title="Memberships"
      subtitle="Prepaid cuts every month, priority booking, zero deposits"
      maxWidth={760}
      stripe
    >
      {current && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Badge tone={current.status === "active" ? "ok" : "warn"}>
              {current.status === "active" ? "Member" : "Payment issue"}
            </Badge>
            <span style={{ fontSize: 14 }}>
              You are on <strong>{current.planName}</strong> with{" "}
              <strong>{current.creditsAvailable}</strong> credit
              {current.creditsAvailable === 1 ? "" : "s"} left this period.
            </span>
            <Link href="/book" style={{ fontSize: 13, fontWeight: 600 }}>
              Book with a credit
            </Link>
          </div>
        </Card>
      )}

      {plans.length === 0 ? (
        <EmptyState title="No membership plans yet" hint="Check back soon." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {plans.map((p) => (
            <Card key={p.id} title={p.name} hover>
              <div style={{ display: "grid", gap: 10 }}>
                <span className="display" style={{ fontSize: 30, fontWeight: 700 }}>
                  {formatMoney(p.priceCents)}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--muted)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    /month
                  </span>
                </span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {p.description ?? ""}
                </span>
                <span style={{ fontSize: 13 }}>
                  <strong>{p.creditsPerPeriod}</strong> cut
                  {p.creditsPerPeriod === 1 ? "" : "s"} per month
                </span>
                {!identity ? (
                  <Link href="/login?mode=signup&next=/memberships" style={{ fontWeight: 600, fontSize: 13 }}>
                    Sign in to join
                  </Link>
                ) : current ? (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    You already have a membership.
                  </span>
                ) : paymentsEnabled ? (
                  <SubscribeButton planId={p.id} />
                ) : (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Ask at the shop to join (online payments not configured).
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
