# BarberBook

Booking app for a single barber shop: clients book online, pay a **deposit**
to lock the slot, set up **recurring appointments** (auto-rebooked standing
slots), or join a **membership** (monthly subscription with cut credits).
Includes a full admin dashboard: calendar, services, hours, payments ledger,
series management, and memberships.

## Stack

Next.js 15 (App Router, server actions) + React 19 + TypeScript, Drizzle ORM
over Postgres (raw-SQL migrations in `drizzle/`), Stripe Checkout for all
payments, embedded Postgres for local dev (no Docker), Vitest for the pure
domain logic.

## Quick start

```bash
npm install
npm run dev:db      # boots embedded Postgres (port 54331/DEV_DB_PORT) + migrations - keep running
npm run seed        # admin + sample client + services + hours + one plan
npm run dev         # Next.js on http://localhost:3000
```

Sign in:

- Admin: `admin@barberbook.local` / `admin1234`
- Client: `client@barberbook.local` / `client1234`

**Without Stripe keys the app runs in "pay at shop" mode** - bookings confirm
immediately, no deposits are collected, and membership subscription checkout
is disabled. Everything else works.

## Enabling Stripe (test mode)

1. Put your test keys in `.env.local`:
   `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_PUBLISHABLE_KEY=pk_test_...`
2. Forward webhooks (REQUIRED for deposits to confirm - without it bookings
   stay "waiting for payment"):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Paste the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
3. Test cards: `4242 4242 4242 4242` (success),
   `4000 0025 0000 3155` (requires authentication - exercises the off-session
   failure path on "Charge remainder").

## How the money flows

- **Deposit at booking**: the appointment row is inserted `pending_deposit`
  with a 30-minute hold (a Postgres gist exclusion constraint on
  `(barber_id, tstzrange)` is the double-booking arbiter), then the client is
  redirected to Stripe Checkout. The `checkout.session.completed` webhook -
  not the redirect - confirms the booking; the success page polls until then.
  A payment that lands after the hold expired is auto-refunded.
- **Remainder**: collected in person, or charged off-session to the saved
  card from the admin calendar drawer. Failures (expired card, SCA) are
  recorded in the payments ledger and surfaced - collect in person.
- **Cancellations**: within the policy window (default 24h) the deposit
  auto-refunds; inside the window it is kept. No-shows keep the deposit and
  can charge a configurable fee.
- **Recurring series**: opting into "repeat every N weeks" at booking saves
  the card; the series engine books each occurrence up to an 8-week rolling
  horizon and charges its deposit off-session. Conflicts get a proposed
  same-day alternative and are flagged in Admin > Series - never silently
  canceled.
- **Memberships**: Stripe subscription; each paid invoice grants that
  period's credits (`invoice.paid` webhook). A credit covers a visit fully -
  no deposit, nothing due. Credits are consumed under a row lock (no
  overdraft) and returned on cancellation. No rollover between periods.

## Cron

Two bearer-token routes (`Authorization: Bearer $CRON_TOKEN`) to run from any
scheduler (Task Scheduler, EventBridge, etc.):

```bash
curl -X POST -H "Authorization: Bearer $CRON_TOKEN" $APP_URL/api/cron/expire-holds        # every ~5 min
curl -X POST -H "Authorization: Bearer $CRON_TOKEN" $APP_URL/api/cron/materialize-series  # daily
```

Admins can also trigger materialization from Admin > Series ("Materialize now").

## Layout

```
drizzle/                     raw SQL migrations (source of truth; ASCII only)
scripts/                     dev-db, seed, dev-grant-credits, dev-inspect
src/db/                      drizzle schema + client + migration runner
src/auth/                    JWT-cookie sessions (jose) + bcrypt passwords
src/domain/<slice>/          pure logic (tested) -> operations -> actions -> load
src/stripe/                  client, checkout builders, webhook handlers
src/app/                     public booking flow, /account, /memberships, /admin/*
```

Domain tests: `npm test` (slot generation incl. DST, deposit policy, series
expansion incl. DST, credits). Typecheck: `npm run typecheck`.

## Windows dev notes

- If the dev DB port is stuck after a crash (`CONNECT_TIMEOUT` while netstat
  shows a dead PID listening), start on another port:
  `DEV_DB_PORT=54332 npm run dev:db` and update `DATABASE_URL`.
- If boot fails with "pre-existing shared memory block is still in use", set
  `DEV_DB_DIR` to a fresh directory (or reboot to reap orphaned postgres).
