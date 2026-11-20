import { Amounts } from './transaction';

export interface Fees {
  readonly baseFeeCents: number;
  readonly deliveryFeeCents: number;
}

export interface IFeesProvider {
  getFees(): Fees;
}

export const FEES_PROVIDER = Symbol('IFeesProvider');

export function calculateAmounts(
  unitPriceCents: number,
  quantity: number,
  fees: Fees,
): Amounts {
  const productAmountCents = unitPriceCents * quantity;
  return {
    productAmountCents,
    baseFeeCents: fees.baseFeeCents,
    deliveryFeeCents: fees.deliveryFeeCents,
    totalAmountCents:
      productAmountCents + fees.baseFeeCents + fees.deliveryFeeCents,
  };
}
