import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { tryGetIdentity } from "@/auth/session";
import { PageShell } from "@/components/ui/PageShell";
import { Card, EmptyState, ButtonLink } from "@/components/ui/primitives";
import { hasReview, loadReviewableAppointment } from "@/domain/reviews/operations";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}): Promise<ReactNode> {
  const { appointmentId } = await params;
  const identity = await tryGetIdentity();
  if (!identity) redirect(`/login?next=/account/review/${appointmentId}`);

  const appt = await loadReviewableAppointment(appointmentId, identity.userId);
  if (!appt) notFound();

  if (await hasReview(appointmentId)) {
    return (
      <PageShell title="Leave a review" maxWidth={520}>
        <Card>
          <EmptyState
            title="You already reviewed this visit"
            hint="Thanks for the feedback."
            action={<ButtonLink href="/account">Back to my appointments</ButtonLink>}
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Leave a review"
      subtitle={`${appt.serviceName} with ${appt.barberName}`}
      maxWidth={520}
    >
      <Card>
        <ReviewForm appointmentId={appointmentId} />
      </Card>
    </PageShell>
  );
}
