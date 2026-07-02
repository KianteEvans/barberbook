import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { barberPhotos, barberServices, barbers, services } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput, TextArea } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import {
  addBarberPhotoAction,
  upsertBarberAction,
} from "@/domain/barbers/actions";
import { formatMoney } from "@/domain/money";
import { OfferingsEditor, type OfferingOption } from "./OfferingsEditor";
import { PhotoDeleteButton } from "./PhotoDeleteButton";

export const dynamic = "force-dynamic";

function BarberFields({
  defaults,
}: {
  defaults?: { displayName: string; tagline: string | null; bio: string | null };
}): ReactNode {
  return (
    <>
      <Field label="Name">
        <TextInput name="displayName" required defaultValue={defaults?.displayName} />
      </Field>
      <Field label="Tagline (one line under the name)">
        <TextInput name="tagline" defaultValue={defaults?.tagline ?? ""} />
      </Field>
      <Field label="Bio">
        <TextArea name="bio" rows={4} defaultValue={defaults?.bio ?? ""} />
      </Field>
      <Field label="Profile photo (JPEG/PNG/WebP, max 5MB)">
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
      </Field>
    </>
  );
}

export default async function AdminBarbersPage(): Promise<ReactNode> {
  const allBarbers = await db.select().from(barbers).orderBy(asc(barbers.createdAt));
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.name));
  const allOfferings = await db.select().from(barberServices);
  const allPhotos = await db
    .select()
    .from(barberPhotos)
    .orderBy(asc(barberPhotos.sortOrder), asc(barberPhotos.createdAt));

  return (
    <PageShell
      title="Barbers"
      subtitle="Profiles, service menus, and work galleries"
      action={
        <FormDrawer
          trigger="Add barber"
          title="Add barber"
          action={upsertBarberAction}
          submitLabel="Create"
        >
          <BarberFields />
        </FormDrawer>
      }
    >
      {allBarbers.length === 0 ? (
        <Card>
          <EmptyState title="No barbers yet" hint="Add your first barber to build a profile." />
        </Card>
      ) : (
        allBarbers.map((b) => {
          const offerings = allOfferings.filter((o) => o.barberId === b.id);
          const photos = allPhotos.filter((p) => p.barberId === b.id);
          const options: OfferingOption[] = allServices.map((s) => {
            const row = offerings.find((o) => o.serviceId === s.id);
            return {
              serviceId: s.id,
              name: s.name,
              shopPriceLabel: formatMoney(s.priceCents),
              offered: row !== undefined,
              overrideCents: row?.priceCents !== null && row?.priceCents !== undefined ? String(row.priceCents) : "",
            };
          });

          return (
            <Card
              key={b.id}
              title={b.displayName}
              action={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge tone={b.active ? "ok" : "neutral"}>
                    {b.active ? "active" : "hidden"}
                  </Badge>
                  <FormDrawer
                    trigger="Edit profile"
                    title={`Edit ${b.displayName}`}
                    action={upsertBarberAction}
                    submitLabel="Save"
                    variant="secondary"
                    hidden={{ id: b.id, active: b.active ? "on" : "off" }}
                  >
                    <BarberFields defaults={b} />
                  </FormDrawer>
                </div>
              }
            >
              <div style={{ display: "grid", gap: 20 }}>
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {b.photoFile ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/uploads/${b.photoFile}`}
                      alt={b.displayName}
                      style={{
                        width: 88,
                        height: 88,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 12,
                        border: "1px dashed var(--border)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 30,
                        fontWeight: 800,
                        color: "var(--muted)",
                      }}
                    >
                      {b.displayName.charAt(0)}
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {b.tagline ?? "No tagline yet"}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--muted)", maxWidth: 560 }}>
                      {b.bio ?? "No bio yet - edit the profile to add one."}
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Services offered</span>
                  <OfferingsEditor barberId={b.id} options={options} />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      Work gallery ({photos.length})
                    </span>
                    <FormDrawer
                      trigger="Add photo"
                      title={`Add photo for ${b.displayName}`}
                      action={addBarberPhotoAction}
                      submitLabel="Upload"
                      variant="secondary"
                      hidden={{ barberId: b.id }}
                    >
                      <Field label="Image (JPEG/PNG/WebP, max 5MB)">
                        <input
                          type="file"
                          name="photo"
                          required
                          accept="image/jpeg,image/png,image/webp"
                        />
                      </Field>
                      <Field label="Caption (optional)">
                        <TextInput name="caption" placeholder="Skin fade + beard sculpt" />
                      </Field>
                    </FormDrawer>
                  </div>
                  {photos.length === 0 ? (
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>
                      No work photos yet.
                    </span>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {photos.map((p) => (
                        <figure key={p.id} style={{ margin: 0, display: "grid", gap: 6 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/uploads/${p.fileName}`}
                            alt={p.caption ?? "Work photo"}
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
                          <PhotoDeleteButton photoId={p.id} />
                        </figure>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </PageShell>
  );
}
