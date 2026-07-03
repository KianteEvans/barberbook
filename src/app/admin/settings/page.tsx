import type { ReactNode } from "react";
import { db } from "@/db/client";
import { shopSettings } from "@/db/schema";
import { PageShell } from "@/components/ui/PageShell";
import { Card } from "@/components/ui/primitives";
import { Field, TextInput, Select } from "@/components/ui/fields";
import { MutationForm } from "@/components/ui/MutationForm";
import {
  removeHeroAction,
  saveHeroAction,
  savePolicyAction,
} from "@/domain/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage(): Promise<ReactNode> {
  const [settings] = await db.select().from(shopSettings);
  if (!settings) {
    return (
      <PageShell title="Settings">
        <Card>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
            Shop is not configured yet - run the seed script.
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Settings" subtitle="Booking policy and landing page">
      <Card title="Booking policy">
        <MutationForm action={savePolicyAction} submitLabel="Save policy">
          <Field label="Cancellation window (hours)">
            <TextInput
              name="cancellationWindowHours"
              type="number"
              min={0}
              max={168}
              required
              defaultValue={String(settings.cancellationWindowHours)}
            />
          </Field>
          <Field label="Deposit mode">
            <Select name="depositMode" defaultValue={settings.depositMode}>
              <option value="fixed">Fixed amount (cents)</option>
              <option value="percent">Percent of price</option>
            </Select>
          </Field>
          <Field label="Deposit value (cents, or whole percent)">
            <TextInput
              name="depositValue"
              type="number"
              min={0}
              required
              defaultValue={String(settings.depositValue)}
            />
          </Field>
          <Field label="No-show fee (cents, 0 = none)">
            <TextInput
              name="noShowFeeCents"
              type="number"
              min={0}
              required
              defaultValue={String(settings.noShowFeeCents)}
            />
          </Field>
        </MutationForm>
      </Card>

      <Card title="Landing hero photo">
        <div style={{ display: "grid", gap: 16 }}>
          {settings.heroFile ? (
            <div style={{ display: "grid", gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/uploads/${settings.heroFile}`}
                alt="Current landing hero"
                style={{
                  width: "100%",
                  maxWidth: 560,
                  aspectRatio: "21 / 9",
                  objectFit: "cover",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border-strong)",
                }}
              />
              <div style={{ maxWidth: 200 }}>
                <MutationForm
                  action={removeHeroAction}
                  submitLabel="Remove photo"
                  variant="danger"
                  successMessage="Hero photo removed."
                />
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
              No hero photo yet - the landing page shows a styled backdrop.
              Upload a wide storefront or in-shop shot for the full effect.
            </p>
          )}

          <MutationForm
            action={saveHeroAction}
            submitLabel={settings.heroFile ? "Replace photo" : "Upload photo"}
            successMessage="Hero photo updated."
          >
            <Field label="Image (JPEG/PNG/WebP, max 5MB, wide crop works best)">
              <input
                type="file"
                name="photo"
                required
                accept="image/jpeg,image/png,image/webp"
              />
            </Field>
          </MutationForm>
        </div>
      </Card>
    </PageShell>
  );
}
