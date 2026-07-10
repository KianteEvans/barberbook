import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barbers } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput, TextArea, Select } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { upsertTestimonialAction } from "@/domain/testimonials/actions";
import { loadAllTestimonials, type TestimonialRow } from "@/domain/testimonials/operations";
import { loadPendingReviews } from "@/domain/reviews/operations";
import { format } from "date-fns";
import { DeleteTestimonialButton } from "./DeleteTestimonialButton";
import { ReviewModeration } from "./ReviewModeration";

export const dynamic = "force-dynamic";

function TestimonialFields({
  defaults,
  barberOptions,
}: {
  defaults?: TestimonialRow;
  barberOptions: Array<{ id: string; displayName: string }>;
}): ReactNode {
  return (
    <>
      <Field label="Author name">
        <TextInput name="authorName" required defaultValue={defaults?.authorName} />
      </Field>
      <Field label="Quote">
        <TextArea name="quote" rows={4} defaultValue={defaults?.quote ?? ""} />
      </Field>
      <Field label="Rating (1-5, blank for none)">
        <Select name="rating" defaultValue={defaults?.rating ? String(defaults.rating) : ""}>
          <option value="">No rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Barber (optional attribution)">
        <Select name="barberId" defaultValue={defaults?.barberId ?? ""}>
          <option value="">No specific barber</option>
          {barberOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.displayName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Sort order (lower shows first)">
        <TextInput
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={String(defaults?.sortOrder ?? 0)}
        />
      </Field>
      <Field label="Show on gallery">
        <Select
          name="featured"
          defaultValue={defaults && !defaults.featured ? "off" : "on"}
        >
          <option value="on">Shown</option>
          <option value="off">Hidden</option>
        </Select>
      </Field>
    </>
  );
}

export default async function AdminTestimonialsPage(): Promise<ReactNode> {
  const all = await loadAllTestimonials();
  const pending = await loadPendingReviews();
  const barberOptions = await db
    .select({ id: barbers.id, displayName: barbers.displayName })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.displayName));

  return (
    <PageShell
      title="Testimonials"
      subtitle="Customer quotes and post-visit reviews shown on the gallery"
      action={
        <FormDrawer
          trigger="Add testimonial"
          title="Add testimonial"
          action={upsertTestimonialAction}
          submitLabel="Create"
        >
          <TestimonialFields barberOptions={barberOptions} />
        </FormDrawer>
      }
    >
      <Card title={`Pending reviews (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyState
            title="No reviews awaiting approval"
            hint="Reviews from completed visits land here for moderation."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Barber</th>
                <th>When</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{r.authorName}</td>
                  <td style={{ color: "var(--accent)", whiteSpace: "nowrap" }}>
                    {"★".repeat(r.rating)}
                  </td>
                  <td style={{ color: "var(--muted)", maxWidth: 300 }}>{r.comment ?? "-"}</td>
                  <td style={{ color: "var(--muted)" }}>{r.barberName}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {format(r.createdAt, "MMM d")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <ReviewModeration reviewId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        {all.length === 0 ? (
          <EmptyState
            title="No testimonials yet"
            hint="Add a customer quote to show it on the gallery page."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Author</th>
                <th>Quote</th>
                <th>Rating</th>
                <th>Barber</th>
                <th>Shown</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {all.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{t.authorName}</td>
                  <td style={{ color: "var(--muted)", maxWidth: 340 }}>
                    {t.quote.length > 90 ? `${t.quote.slice(0, 90)}...` : t.quote}
                  </td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--accent)" }}>
                    {t.rating ? "★".repeat(t.rating) : "-"}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{t.barberName ?? "-"}</td>
                  <td>
                    <Badge tone={t.featured ? "ok" : "neutral"}>
                      {t.featured ? "shown" : "hidden"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <FormDrawer
                        trigger="Edit"
                        title={`Edit ${t.authorName}`}
                        action={upsertTestimonialAction}
                        submitLabel="Save"
                        variant="secondary"
                        hidden={{ id: t.id }}
                      >
                        <TestimonialFields defaults={t} barberOptions={barberOptions} />
                      </FormDrawer>
                      <DeleteTestimonialButton id={t.id} />
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
