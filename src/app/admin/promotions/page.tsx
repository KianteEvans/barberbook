import type { ReactNode } from "react";
import { format } from "date-fns";
import { PageShell } from "@/components/ui/PageShell";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput, Select } from "@/components/ui/fields";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { createDiscountCodeAction } from "@/domain/promotions/actions";
import { loadAllDiscountCodes } from "@/domain/promotions/operations";
import { codeRedeemable } from "@/domain/promotions/discount";
import { formatMoney } from "@/domain/money";
import { CodeActions } from "./CodeActions";

export const dynamic = "force-dynamic";

export default async function AdminPromotionsPage(): Promise<ReactNode> {
  const codes = await loadAllDiscountCodes();
  const now = new Date();

  return (
    <PageShell
      title="Promotions"
      subtitle="Promo codes clients can apply at checkout"
      action={
        <FormDrawer
          trigger="New code"
          title="Create promo code"
          action={createDiscountCodeAction}
          submitLabel="Create"
        >
          <Field label="Code (letters and numbers)">
            <TextInput name="code" required placeholder="WELCOME10" />
          </Field>
          <Field label="Type">
            <Select name="kind" defaultValue="percent">
              <option value="percent">Percent off</option>
              <option value="fixed">Dollar amount off</option>
            </Select>
          </Field>
          <Field label="Amount (percent 1-100, or dollars for fixed)">
            <TextInput name="amountValue" type="number" min={1} required />
          </Field>
          <Field label="Max uses (blank = unlimited)">
            <TextInput name="maxUses" type="number" min={1} />
          </Field>
          <Field label="Expires on (blank = never)">
            <TextInput name="expiresAt" type="date" />
          </Field>
        </FormDrawer>
      }
    >
      <Card>
        {codes.length === 0 ? (
          <EmptyState
            title="No promo codes yet"
            hint="Create a code and clients can enter it on the booking confirmation page."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Used</th>
                <th>Expires</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const live = codeRedeemable(c, now);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
                      {c.code}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.kind === "percent"
                        ? `${c.amount}% off`
                        : `${formatMoney(c.amount)} off`}
                    </td>
                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {c.usedCount}
                      {c.maxUses === null ? "" : ` / ${c.maxUses}`}
                    </td>
                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {c.expiresAt ? format(c.expiresAt, "MMM d, yyyy") : "Never"}
                    </td>
                    <td>
                      <Badge tone={live ? "ok" : "neutral"}>
                        {live ? "active" : c.active ? "expired" : "disabled"}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <CodeActions id={c.id} active={c.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </PageShell>
  );
}
