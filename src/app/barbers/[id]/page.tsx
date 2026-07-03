import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, ButtonLink, EmptyState } from "@/components/ui/primitives";
import { loadBarberProfile } from "@/domain/barbers/operations";
import { parseSpecialties } from "@/domain/barbers/specialties";
import { formatMoney } from "@/domain/money";

export const dynamic = "force-dynamic";

export default async function BarberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ReactNode> {
  const { id } = await params;
  let profile;
  try {
    profile = await loadBarberProfile(id);
  } catch {
    notFound();
  }

  return (
    <PageShell
      title={profile.displayName}
      subtitle={profile.tagline ?? undefined}
      maxWidth={880}
      stripe
    >
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {profile.photoFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${profile.photoFile}`}
            alt={profile.displayName}
            style={{
              width: 200,
              height: 200,
              objectFit: "cover",
              borderRadius: 16,
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          />
        ) : (
          <div
            className="display"
            style={{
              width: 200,
              height: 200,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              fontSize: 96,
              fontWeight: 700,
              color: "color-mix(in srgb, var(--accent) 30%, transparent)",
              background: "var(--panel-2)",
            }}
          >
            {profile.displayName.charAt(0)}
          </div>
        )}
        <div style={{ flex: "1 1 320px", display: "grid", gap: 14, alignContent: "start" }}>
          {parseSpecialties(profile.specialties).length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--muted)",
                }}
              >
                Specialty cuts
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {parseSpecialties(profile.specialties).map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {profile.bio && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--muted)",
              }}
            >
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      <Card title={`Book with ${profile.displayName}`}>
        {profile.offerings.length === 0 ? (
          <EmptyState
            title="No services listed yet"
            hint="This barber's menu is being set up."
          />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {profile.offerings.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "grid", gap: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.name}
                    {s.isOverride && (
                      <span style={{ marginLeft: 8 }}>
                        <Badge tone="info">{profile.displayName}&apos;s price</Badge>
                      </span>
                    )}
                  </span>
                  {s.description && (
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      {s.description}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.durationMin} min
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span className="display" style={{ fontWeight: 600, fontSize: 20 }}>
                    {formatMoney(s.priceCents)}
                  </span>
                  <ButtonLink href={`/book/${s.id}?barber=${profile.id}`}>
                    Book
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {profile.photos.length > 0 && (
        <Card title="Recent work">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {profile.photos.map((p) => (
              <figure key={p.id} style={{ margin: 0, display: "grid", gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${p.fileName}`}
                  alt={p.caption ?? `Work by ${profile.displayName}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                  }}
                />
                {p.caption && (
                  <figcaption style={{ fontSize: 12, color: "var(--muted)" }}>
                    {p.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
