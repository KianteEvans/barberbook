import type { ServicePricing } from "@/domain/payments/deposit";

/**
 * Pure per-barber pricing: a barber_services row may carry a price override;
 * NULL means the shop's standard price. Deposit policy is unchanged - the
 * effective pricing feeds straight into computeDeposit.
 */
export function effectivePricing(
  service: ServicePricing,
  overrideCents: number | null,
): ServicePricing {
  return {
    priceCents: overrideCents ?? service.priceCents,
    depositCents: service.depositCents,
  };
}
