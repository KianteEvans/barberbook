"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";
import { signSession, setSessionCookie, clearSessionCookie } from "./session";
import { parseOrThrow, formObject, type ActionState } from "@/domain/forms";
import { toActionError, ValidationError } from "@/domain/errors";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

const signupSchema = z.object({
  name: z.string().min(1, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  next: z.string().optional(),
});

/** Only allow same-app relative redirect targets. */
function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let target: string;
  try {
    const input = parseOrThrow(loginSchema, formObject(formData));
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()));
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new ValidationError("Wrong email or password.");
    }
    const token = await signSession({
      uid: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);
    target = user.role === "admin" ? "/admin" : safeNext(input.next);
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
  redirect(target);
}

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let target: string;
  try {
    const input = parseOrThrow(signupSchema, formObject(formData));
    const email = input.email.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      throw new ValidationError("An account with that email already exists. Sign in instead.");
    }
    const [user] = await db
      .insert(users)
      .values({
        email,
        name: input.name,
        phone: input.phone ?? null,
        passwordHash: await hashPassword(input.password),
        role: "client",
      })
      .returning();
    if (!user) throw new Error("insert failed");
    const token = await signSession({
      uid: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);
    target = safeNext(input.next);
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
