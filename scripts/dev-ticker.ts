/**
 * Dev-only scheduler: POST /api/cron/tick every 60s so reminders, releases,
 * and promotions fire automatically in local dev. Production points a real
 * scheduler (cron, EventBridge, etc.) at the same URL instead.
 *
 * Run detached alongside dev:db and dev:
 *   Start-Process powershell -ArgumentList '-Command','npx tsx scripts/dev-ticker.ts'
 */

const APP_URL = process.env.APP_URL ?? "http://localhost:3002";
const CRON_TOKEN = process.env.CRON_TOKEN ?? "dev-cron-token";
const INTERVAL_MS = 60_000;

async function tick(): Promise<void> {
  try {
    const res = await fetch(`${APP_URL}/api/cron/tick`, {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_TOKEN}` },
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[ticker] ${new Date().toISOString()} -> ${res.status}`, body);
  } catch (err) {
    console.error("[ticker] request failed:", err);
  }
}

async function main(): Promise<void> {
  console.log(`[ticker] polling ${APP_URL}/api/cron/tick every ${INTERVAL_MS / 1000}s`);
  // Fire once immediately, then on the interval.
  await tick();
  setInterval(() => void tick(), INTERVAL_MS);
}

main().catch((err: unknown) => {
  console.error("[ticker] fatal:", err);
  process.exit(1);
});
