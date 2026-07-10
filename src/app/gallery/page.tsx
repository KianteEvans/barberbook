import type { ReactNode } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barberPhotos, barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { loadPublicTestimonials } from "@/domain/testimonials/operations";
import { approvedReviewStats, loadApprovedReviews } from "@/domain/reviews/operations";
import { GalleryGrid } from "./GalleryGrid";

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
  const reviews = await loadApprovedReviews();
  const stats = await approvedReviewStats();

  // Unified "what clients say" feed: hand-picked testimonials + approved reviews.
  const voices = [
    ...testimonials.map((t) => ({
      key: `t-${t.id}`,
      quote: t.quote as string | null,
      rating: t.rating,
      authorName: t.authorName,
      barberName: t.barberName,
    })),
    ...reviews.map((r) => ({
      key: `r-${r.id}`,
      quote: r.comment,
      rating: r.rating,
      authorName: r.authorName,
      barberName: r.barberName,
    })),
  ];

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
          <GalleryGrid photos={photos} />
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
        {stats.count > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="display" style={{ fontSize: 28, fontWeight: 700 }}>
              {stats.average.toFixed(1)}
            </span>
            <Stars rating={Math.round(stats.average)} />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              from {stats.count} review{stats.count === 1 ? "" : "s"}
            </span>
          </div>
        )}
        {voices.length === 0 ? (
          <EmptyState title="No testimonials yet" hint="Check back soon." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {voices.map((t) => (
              <Card key={t.key} hover>
                <div style={{ display: "grid", gap: 10 }}>
                  {t.rating !== null && <Stars rating={t.rating} />}
                  {t.quote && (
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
                  )}
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
