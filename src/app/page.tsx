import type { ReactNode } from "react";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  barberServices,
  barbers,
  membershipPlans,
  services,
  shopSettings,
} from "@/db/schema";
import { Badge, ButtonLink } from "@/components/ui/primitives";
import { isBackdrop, type Backdrop } from "@/domain/backdrops";
import { effectivePricing } from "@/domain/barbers/pricing";
import { parseSpecialties } from "@/domain/barbers/specialties";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ backdrop?: string }>;
}): Promise<ReactNode> {
  const query = await searchParams;
  const [settings] = await db.select().from(shopSettings);
  // ?backdrop= previews any style without saving; the stored one is default.
  const backdrop: Backdrop = isBackdrop(query.backdrop)
    ? query.backdrop
    : isBackdrop(settings?.backdrop)
      ? settings.backdrop
      : "skyline";
  const activeBarbers = await db
    .select()
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.createdAt));
  // Every (barber, service) offering with its effective price, one query.
  const offerings = await db
    .select({
      barberId: barberServices.barberId,
      overrideCents: barberServices.priceCents,
      priceCents: services.priceCents,
      depositCents: services.depositCents,
    })
    .from(barberServices)
    .innerJoin(services, and(eq(barberServices.serviceId, services.id)))
    .where(eq(services.active, true));
  const fromPriceByBarber = new Map<string, number>();
  for (const o of offerings) {
    const price = effectivePricing(o, o.overrideCents).priceCents;
    const cur = fromPriceByBarber.get(o.barberId);
    if (cur === undefined || price < cur) fromPriceByBarber.set(o.barberId, price);
  }
  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.active, true));

  const heroFile = settings?.heroFile ?? null;

  return (
    <div className={`city-backdrop backdrop-${backdrop}`}>
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
      {/* The chairs: the roster IS the homepage. Book direct or open the
          profile for history, specialty cuts, and their menu. */}
      <section className="fade-in-up stagger-2" style={{ display: "grid", gap: 18 }}>
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
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Pick your barber - book straight from here
          </span>
        </div>
        {activeBarbers.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            No barbers listed yet - check back soon.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 16,
            }}
          >
            {activeBarbers.map((b, i) => {
              const fromPrice = fromPriceByBarber.get(b.id);
              const specialties = parseSpecialties(b.specialties).slice(0, 3);
              return (
                <div
                  key={b.id}
                  className={`card-hover fade-in-up stagger-${Math.min(i + 2, 6)}`}
                  style={{
                    display: "grid",
                    gap: 12,
                    alignContent: "start",
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: 16,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <Link
                    href={`/barbers/${b.id}`}
                    style={{ textDecoration: "none", color: "var(--text)", display: "grid", gap: 12 }}
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
                    <div style={{ display: "grid", gap: 6 }}>
                      <span
                        className="display"
                        style={{ fontWeight: 600, fontSize: 20, letterSpacing: "0.02em" }}
                      >
                        {b.displayName}
                      </span>
                      {b.tagline && (
                        <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                          {b.tagline}
                        </span>
                      )}
                      {specialties.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {specialties.map((s) => (
                            <Badge key={s}>{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderTop: "1px solid var(--border)",
                      paddingTop: 12,
                    }}
                  >
                    {fromPrice !== undefined ? (
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>
                        From{" "}
                        <span
                          className="display"
                          style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}
                        >
                          {formatMoney(fromPrice)}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Menu coming soon</span>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <ButtonLink href={`/barbers/${b.id}`} variant="secondary">
                        Profile
                      </ButtonLink>
                      <ButtonLink href={`/book?barber=${b.id}`}>Book</ButtonLink>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
    </div>
  );
}
