import type { ReactNode } from "react";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers, membershipPlans, services, shopSettings } from "@/db/schema";
import { Badge, ButtonLink } from "@/components/ui/primitives";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function HomePage(): Promise<ReactNode> {
  const [settings] = await db.select().from(shopSettings);
  const activeServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.priceCents));
  const activeBarbers = await db
    .select()
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.displayName));
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.active, true));

  const heroFile = settings?.heroFile ?? null;

  return (
    <>
      {/* Full-bleed poster hero: uploaded photo (always dark-styled for
          contrast) or a theme-aware gradient backdrop. */}
      <section
        className={heroFile ? "fade-in-up" : "fade-in-up hero-backdrop"}
        {...(heroFile ? { "data-theme": "dark" } : {})}
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: 420,
          padding: "clamp(48px, 8vw, 96px) clamp(16px, 4vw, 32px)",
          borderBottom: "1px solid var(--border)",
          ...(heroFile
            ? {
                backgroundImage: `linear-gradient(rgba(8,8,10,0.55), rgba(8,8,10,0.78)), url(/api/uploads/${heroFile})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        <div
          style={{
            textAlign: "center",
            display: "grid",
            gap: 18,
            justifyItems: "center",
            ...(heroFile ? { color: "var(--text)" } : {}),
          }}
        >
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: "clamp(40px, 8vw, 72px)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 1.05,
            }}
          >
            {settings?.shopName ?? "BarberBook"}
          </h1>
          <div className="pole-stripe" style={{ width: 140 }} />
          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              fontSize: 16,
              maxWidth: 520,
              lineHeight: 1.6,
            }}
          >
            Walk in sharp, walk out sharper. Lock your slot with a deposit, keep a
            standing appointment, or join the club.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 6,
            }}
          >
            <ButtonLink href="/book">Book an appointment</ButtonLink>
            <ButtonLink href="/barbers" variant="secondary">
              Choose your barber
            </ButtonLink>
            <ButtonLink href="/memberships" variant="secondary">
              Memberships
            </ButtonLink>
          </div>
        </div>
      </section>

      <main
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "clamp(24px, 6vw, 64px) clamp(16px, 4vw, 32px)",
          display: "grid",
          gap: 56,
        }}
      >
      {/* Services showcase */}
      <section className="fade-in-up stagger-2" style={{ display: "grid", gap: 18 }}>
        <h2
          className="display"
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          The menu
        </h2>
        {activeServices.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            No services yet - check back soon.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {activeServices.map((s) => (
              <Link
                key={s.id}
                href={`/book/${s.id}`}
                className="card-hover"
                style={{
                  display: "grid",
                  gap: 10,
                  alignContent: "start",
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "18px 20px",
                  textDecoration: "none",
                  color: "var(--text)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                  <Badge>{s.durationMin} min</Badge>
                </div>
                {s.description && (
                  <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                    {s.description}
                  </span>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}
                >
                  <span className="display" style={{ fontSize: 22, fontWeight: 600 }}>
                    {formatMoney(s.priceCents)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                    Book {">"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Meet the barbers */}
      {activeBarbers.length > 0 && (
        <section className="fade-in-up stagger-3" style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h2
              className="display"
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              The chairs
            </h2>
            <Link href="/barbers" style={{ fontSize: 13, fontWeight: 600 }}>
              All barbers {">"}
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {activeBarbers.slice(0, 4).map((b) => (
              <Link
                key={b.id}
                href={`/barbers/${b.id}`}
                className="card-hover"
                style={{
                  display: "grid",
                  gap: 10,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 14,
                  textDecoration: "none",
                  color: "var(--text)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {b.photoFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${b.photoFile}`}
                    alt={b.displayName}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border-strong)",
                    }}
                  />
                ) : (
                  <div
                    className="display"
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "var(--radius)",
                      background: "var(--panel-2)",
                      border: "1px solid var(--border)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 84,
                      fontWeight: 700,
                      color: "color-mix(in srgb, var(--accent) 30%, transparent)",
                    }}
                  >
                    {b.displayName.charAt(0)}
                  </div>
                )}
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{b.displayName}</span>
                  {b.tagline && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{b.tagline}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Membership teaser */}
      {plan && (
        <section
          className="fade-in-up stagger-4"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background:
              "linear-gradient(color-mix(in srgb, var(--accent) 8%, var(--panel)), var(--panel))",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
            borderRadius: "var(--radius-lg)",
            padding: "22px 26px",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span
              className="display"
              style={{
                fontSize: 19,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {plan.name} - {formatMoney(plan.priceCents)}/mo
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {plan.creditsPerPeriod} cuts a month, zero deposits, priority booking.
            </span>
          </div>
          <ButtonLink href="/memberships">Join the club</ButtonLink>
        </section>
      )}
      </main>
    </>
  );
}
