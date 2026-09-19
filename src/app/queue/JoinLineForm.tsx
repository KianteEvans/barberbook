"use client";

import type { ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import { Field, TextInput, Select } from "@/components/ui/fields";
import { joinQueueSelfAction } from "@/domain/walkins/actions";

/**
 * Public "get in line from your phone" form. The action redirects to the
 * client's own ticket page on success, so there is no client-side wiring.
 */
export function JoinLineForm({
  barbers,
  services,
}: {
  barbers: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
}): ReactNode {
  return (
    <MutationForm
      action={joinQueueSelfAction}
      submitLabel="Get in line"
      successMessage="You're in the line."
    >
      <Field label="Your name">
        <TextInput name="name" required placeholder="First name is fine" />
      </Field>
      <Field label="Mobile number (so we can text you when you're up)">
        <TextInput name="phone" type="tel" placeholder="555-010-0123" />
      </Field>
      <Field label="What are you getting?">
        <Select name="serviceId" defaultValue="">
          <option value="">Not sure yet</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Any barber, or someone specific?">
        <Select name="barberId" defaultValue="">
          <option value="">First available</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      {/* Honeypot - hidden from people, catnip for bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
      />
    </MutationForm>
  );
}
