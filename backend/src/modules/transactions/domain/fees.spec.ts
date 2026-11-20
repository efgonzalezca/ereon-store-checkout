import { calculateAmounts } from './fees';

describe('calculateAmounts', () => {
  it('adds the base and delivery fees to the product amount', () => {
    expect(
      calculateAmounts(8990000, 2, {
        baseFeeCents: 300000,
        deliveryFeeCents: 1200000,
      }),
    ).toEqual({
      productAmountCents: 17980000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 19480000,
    });
  });
});
