/**
 * Pure payout math. Every dollar a barber is owed comes from here.
 *
 * The rule that matters most: CASH TIPS ARE ALREADY IN THE BARBER'S POCKET.
 * They are reported so the period reads honestly (and so tip income is on the
 * record), but they are never added to what the shop still owes. Card tips
 * are - the shop collected those on the barber's behalf.
 */

export type CompType = "none" | "commission" | "booth_rent" | "hourly";

export interface Compensation {
  readonly type: CompType;
  /** Share of service gross the barber keeps, 0-100. */
  readonly commissionPct?: number | null;
  /** Flat rent the barber owes the shop for the chair, per period. */
  readonly boothRentCents?: number | null;
  readonly boothRentPeriod?: "weekly" | "monthly" | null;
  readonly hourlyCents?: number | null;
}

export interface PayoutInput {
  /** Service + product revenue this barber generated, net of discounts. */
  readonly grossCents: number;
  /** Tips the shop collected (card/other) and therefore owes onward. */
  readonly cardTipsCents: number;
  /** Tips handed straight to the barber - reported, never owed. */
  readonly cashTipsCents: number;
  readonly comp: Compensation;
  /** Length of the period, used to pro-rate booth rent. */
  readonly periodWeeks?: number;
  /** Hours worked; only used for hourly comp. */
  readonly hoursWorked?: number;
  /** Manual correction, positive or negative. */
  readonly adjustmentCents?: number;
}

export interface PayoutLine {
  readonly label: string;
  readonly amountCents: number;
  /** False for lines shown for context that do not move the net. */
  readonly countsTowardNet: boolean;
}

export interface Payout {
  readonly grossCents: number;
  readonly commissionCents: number;
  readonly boothRentCents: number;
  readonly hourlyCents: number;
  readonly cardTipsCents: number;
  readonly cashTipsCents: number;
  readonly adjustmentCents: number;
  /** What the shop actually hands over. Never negative. */
  readonly netCents: number;
  /** Negative when the barber owes the shop (rent exceeded card tips). */
  readonly balanceCents: number;
  readonly lines: readonly PayoutLine[];
}

const round = (n: number): number => Math.round(n);

export function computePayout(input: PayoutInput): Payout {
  const gross = Math.max(0, round(input.grossCents));
  const cardTips = Math.max(0, round(input.cardTipsCents));
  const cashTips = Math.max(0, round(input.cashTipsCents));
  const adjustment = round(input.adjustmentCents ?? 0);
  const weeks = Math.max(0, input.periodWeeks ?? 1);

  let commission = 0;
  let boothRent = 0;
  let hourly = 0;

  switch (input.comp.type) {
    case "commission":
      // The barber keeps a share of what they sold.
      commission = round((gross * Math.max(0, Math.min(100, input.comp.commissionPct ?? 0))) / 100);
      break;
    case "booth_rent": {
      // The barber keeps ALL their gross and owes the shop rent instead. That
      // money never flowed through the shop, so it is not ours to pay out.
      const perPeriod = Math.max(0, input.comp.boothRentCents ?? 0);
      boothRent =
        input.comp.boothRentPeriod === "monthly"
          ? round(perPeriod * (weeks / 4.345))
          : round(perPeriod * weeks);
      break;
    }
    case "hourly":
      hourly = round(Math.max(0, input.comp.hourlyCents ?? 0) * Math.max(0, input.hoursWorked ?? 0));
      break;
    case "none":
      break;
  }

  // What the shop owes: earned pay + tips it is holding - rent - corrections.
  const balance = commission + hourly + cardTips - boothRent + adjustment;

  const lines: PayoutLine[] = [
    { label: "Service + product gross", amountCents: gross, countsTowardNet: false },
  ];
  if (input.comp.type === "commission") {
    lines.push({
      label: `Commission (${input.comp.commissionPct ?? 0}%)`,
      amountCents: commission,
      countsTowardNet: true,
    });
  }
  if (input.comp.type === "hourly") {
    lines.push({ label: "Hourly", amountCents: hourly, countsTowardNet: true });
  }
  if (input.comp.type === "booth_rent") {
    lines.push({ label: "Booth rent", amountCents: -boothRent, countsTowardNet: true });
    lines.push({
      label: "Kept at the chair (paid direct)",
      amountCents: gross,
      countsTowardNet: false,
    });
  }
  if (cardTips > 0) {
    lines.push({ label: "Card tips", amountCents: cardTips, countsTowardNet: true });
  }
  if (cashTips > 0) {
    lines.push({
      label: "Cash tips (already taken)",
      amountCents: cashTips,
      countsTowardNet: false,
    });
  }
  if (adjustment !== 0) {
    lines.push({ label: "Adjustment", amountCents: adjustment, countsTowardNet: true });
  }

  return {
    grossCents: gross,
    commissionCents: commission,
    boothRentCents: boothRent,
    hourlyCents: hourly,
    cardTipsCents: cardTips,
    cashTipsCents: cashTips,
    adjustmentCents: adjustment,
    netCents: Math.max(0, balance),
    balanceCents: balance,
    lines,
  };
}
