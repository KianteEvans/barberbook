import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications, users } from "@/db/schema";
import { sendEmail } from "@/notifications/delivery";
import { sendSms } from "@/notifications/sms";

/**
 * Notifications: an in-app row is the source of truth; email is best-effort on
 * top (never blocks the row). Callers pass a resolved userId.
 */

export type NotificationKind =
  | "reminder"
  | "confirm_needed"
  | "released"
  | "promoted"
  | "review_request"
  | "loyalty";

export interface NotificationRow {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly appointmentId: string | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

/**
 * Insert an in-app notification and fire best-effort email + SMS to the user.
 * Both channels no-op without their provider keys; failures never block the
 * in-app row.
 */
export async function createNotification(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  appointmentId: string | null = null,
): Promise<void> {
  await db.insert(notifications).values({ userId, kind, title, body, appointmentId });
  try {
    const [user] = await db
      .select({ email: users.email, phone: users.phone })
      .from(users)
      .where(eq(users.id, userId));
    if (user?.email) await sendEmail(user.email, title, body);
    if (user?.phone) await sendSms(user.phone, `${title}\n${body}`);
  } catch (err) {
    console.error("[notifications] dispatch failed:", err);
  }
}

export async function loadUserNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationRow[]> {
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      title: notifications.title,
      body: notifications.body,
      appointmentId: notifications.appointmentId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}
