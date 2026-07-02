/**
 * Pure membership-credit math. One ledger row per billing period; credits are
 * only spendable inside their own period (no rollover in v1).
 */

export interface CreditRow {
  readonly id: string;
  readonly granted: number;
  readonly consumed: number;
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

function inPeriod(row: CreditRow, now: Date): boolean {
  return row.periodStart <= now && now < row.periodEnd;
}

/** Spendable credits right now. */
export function creditsAvailable(rows: readonly CreditRow[], now: Date): number {
  return rows
    .filter((r) => inPeriod(r, now))
    .reduce((sum, r) => sum + Math.max(0, r.granted - r.consumed), 0);
}

/** The ledger row a new consumption should draw from, or null. */
export function pickCreditRow(
  rows: readonly CreditRow[],
  now: Date,
): CreditRow | null {
  return rows.find((r) => inPeriod(r, now) && r.granted - r.consumed > 0) ?? null;
}
