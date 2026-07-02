import type { ReactNode } from "react";
import { db } from "@/db/client";
import { services, shopSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ButtonLink, Card } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<ReactNode> {
  const [settings] = await db.select().from(shopSettings);
  const activeServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true));

  return (
    <main
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "clamp(24px, 6vw, 56px) clamp(16px, 4vw, 32px)",
        display: "grid",
        gap: 32,
      }}
    >
      <section style={{ textAlign: "center", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800 }}>
          {settings?.shopName ?? "BarberBook"}
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 16 }}>
          Book your next cut online. Lock your slot with a deposit, set up a
          standing appointment, or join a membership.
        </p>
        <div style={{ justifySelf: "center", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <ButtonLink href="/book">Book an appointment</ButtonLink>
          <ButtonLink href="/barbers" variant="secondary">
            Choose your barber
          </ButtonLink>
          <ButtonLink href="/memberships" variant="secondary">
            Memberships
          </ButtonLink>
        </div>
      </section>

      <Card title="Services">
        {activeServices.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            No services yet - run the seed script or add them in the admin.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Duration</th>
                <th style={{ textAlign: "right" }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {activeServices.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: "var(--muted)" }}>{s.durationMin} min</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(s.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
