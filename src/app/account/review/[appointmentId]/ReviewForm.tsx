"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MutationForm } from "@/components/ui/MutationForm";
import { Field, TextArea } from "@/components/ui/fields";
import { submitReviewAction } from "@/domain/reviews/actions";

export function ReviewForm({ appointmentId }: { appointmentId: string }): ReactNode {
  const [rating, setRating] = useState(5);
  const router = useRouter();

  return (
    <MutationForm
      action={submitReviewAction}
      submitLabel="Submit review"
      successMessage="Thanks - your review is pending approval."
      hidden={{ appointmentId, rating: String(rating) }}
      onSuccess={() => router.push("/account")}
    >
      <Field label="Rating">
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 30,
                lineHeight: 1,
                padding: 0,
                color: n <= rating ? "var(--accent)" : "var(--border-strong)",
              }}
            >
              {"★"}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Comment (optional)">
        <TextArea name="comment" rows={4} placeholder="How was your cut?" />
      </Field>
    </MutationForm>
  );
}
