import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barberPhotos, barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { loadPublicTestimonials } from "@/domain/testimonials/operations";

export const dynamic = "force-dynamic";

function Stars({ rating }: { rating: number }): ReactNode {
  const full = Math.max(0, Math.min(5, rating));
  return (
    <span aria-label={`${full} out of 5 stars`} style={{ letterSpacing: 2, fontSize: 14 }}>
      <span style={{ color: "var(--accent)" }}>{"★".repeat(full)}</span>
      <span style={{ color: "var(--border-strong)" }}>{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default async function GalleryPage(): Promise<ReactNode> {
  const photos = await db
    .select({
      id: barberPhotos.id,
      fileName: barberPhotos.fileName,
      caption: barberPhotos.caption,
      barberName: barbers.displayName,
    })
    .from(barberPhotos)
    .innerJoin(barbers, eq(barberPhotos.barberId, barbers.id))
    .where(eq(barbers.active, true))
    .orderBy(desc(barberPhotos.createdAt))
    .limit(60);

  const testimonials = await loadPublicTestimonials();

  return (
    <PageShell
      title="Gallery"
      subtitle="Fresh cuts from the chairs and what the neighborhood says"
      maxWidth={980}
      stripe
    >
      <section className="fade-in-up" style={{ display: "grid", gap: 16 }}>
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
          The work
        </h2>
        {photos.length === 0 ? (
          <EmptyState
            title="No photos yet"
            hint="Work shots appear here as barbers add them to their profiles."
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {photos.map((p) => (
              <figure
                key={p.id}
                className="card-hover"
                style={{
                  margin: 0,
                  display: "grid",
                  gap: 8,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 10,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${p.fileName}`}
                  alt={p.caption ?? `Work by ${p.barberName}`}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border-strong)",
                  }}
                />
                <figcaption style={{ display: "grid", gap: 2 }}>
                  {p.caption && (
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.caption}</span>
                  )}
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {p.barberName}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section className="fade-in-up stagger-2" style={{ display: "grid", gap: 16 }}>
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
          What clients say
        </h2>
        {testimonials.length === 0 ? (
          <EmptyState title="No testimonials yet" hint="Check back soon." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {testimonials.map((t) => (
              <Card key={t.id} hover>
                <div style={{ display: "grid", gap: 10 }}>
                  {t.rating !== null && <Stars rating={t.rating} />}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--text)",
                    }}
                  >
                    {"“"}
                    {t.quote}
                    {"”"}
                  </p>
                  <div style={{ display: "grid", gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{t.authorName}</span>
                    {t.barberName && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        on a cut with {t.barberName}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
