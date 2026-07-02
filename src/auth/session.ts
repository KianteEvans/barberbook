import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/env";
import { UnauthorizedError, ForbiddenError } from "@/domain/errors";

/**
 * Session = a signed, httpOnly JWT cookie. The client only ever holds this
 * signed token; the server re-derives identity from it on every request.
 * Simplified from the PartnerOS module: no tenants, no SSO, two roles.
 */

export const SESSION_COOKIE = "barberbook_session";
const ISSUER = "barberbook";
const AUDIENCE = "barberbook-app";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days - booking clients return rarely

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);

const sessionClaims = z.object({
  uid: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "client"]),
});

export type SessionClaims = z.infer<typeof sessionClaims>;

export interface Identity {
  readonly userId: string;
  readonly email: string;
  readonly role: "admin" | "client";
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<Identity> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    const claims = sessionClaims.parse(payload);
    return { userId: claims.uid, email: claims.email, role: claims.role };
  } catch {
    throw new UnauthorizedError("Session expired. Please sign in again.");
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Identity or null - for pages that render both signed-in and anonymous. */
export const tryGetIdentity = cache(async (): Promise<Identity | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
});

/** Identity or throw - for pages/actions that require sign-in. */
export async function getIdentity(): Promise<Identity> {
  const identity = await tryGetIdentity();
  if (!identity) throw new UnauthorizedError();
  return identity;
}

/** Identity with the admin role, or throw. */
export async function getAdminIdentity(): Promise<Identity> {
  const identity = await getIdentity();
  if (identity.role !== "admin") throw new ForbiddenError();
  return identity;
}
