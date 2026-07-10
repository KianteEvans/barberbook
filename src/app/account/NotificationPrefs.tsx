"use client";

import type { ReactNode } from "react";
import { MutationForm } from "@/components/ui/MutationForm";
import { updateNotificationPrefsAction } from "@/domain/notifications/prefs-actions";

/** Two opt-in toggles for email + SMS reminders. In-app alerts always stay on. */
export function NotificationPrefs({
  emailOn,
  smsOn,
  hasPhone,
}: {
  emailOn: boolean;
  smsOn: boolean;
  hasPhone: boolean;
}): ReactNode {
  const row = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    fontWeight: 500,
  } as const;

  return (
    <MutationForm
      action={updateNotificationPrefsAction}
      submitLabel="Save preferences"
      successMessage="Preferences saved."
    >
      <div style={{ display: "grid", gap: 12 }}>
        <label style={row}>
          <input type="checkbox" name="email" defaultChecked={emailOn} />
          Email reminders and updates
        </label>
        <label style={{ ...row, opacity: hasPhone ? 1 : 0.6 }}>
          <input type="checkbox" name="sms" defaultChecked={smsOn} disabled={!hasPhone} />
          Text (SMS) reminders{hasPhone ? "" : " - add a phone number first"}
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          In-app notifications always stay on so you never miss a booking change.
        </p>
      </div>
    </MutationForm>
  );
}
