import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

/**
 * Bearer-token gate for /api/cron/* routes. SHA-256 both sides and compare in
 * constant time so token length is not observable.
 */
export function authorizeCron(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) return false;
  const presented = createHash("sha256").update(match[1]!).digest();
  const expected = createHash("sha256").update(env.CRON_TOKEN).digest();
  return timingSafeEqual(presented, expected);
}
