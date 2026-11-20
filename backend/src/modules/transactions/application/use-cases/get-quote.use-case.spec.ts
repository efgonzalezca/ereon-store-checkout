import { NotFoundError, OutOfStockError } from '../../../../shared/rop/errors';
import { Err, Ok } from '../../../../shared/rop/result';
import { Amounts } from '../../domain/transaction';
import { GetQuoteUseCase } from './get-quote.use-case';

const product = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Desk Lamp',
  description: 'LED lamp',
  priceInCents: 8990000,
  stock: 2,
  imageUrl: '/images/products/desk-lamp.webp',
};

function build(found: typeof product | null) {
  return new GetQuoteUseCase(
    { findAll: jest.fn(), findById: jest.fn().mockResolvedValue(found) },
    { getFees: () => ({ baseFeeCents: 300000, deliveryFeeCents: 1200000 }) },
  );
}

describe('GetQuoteUseCase', () => {
  it('quotes the product amount plus both fees, accepting quantity equal to stock', async () => {
    const result = await build(product).execute(product.id, 2);

    expect((result as Ok<Amounts>).value).toEqual({
      productAmountCents: 17980000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 19480000,
    });
  });

  it('fails with NotFoundError for an unknown product', async () => {
    const result = await build(null).execute(product.id, 1);

    expect((result as Err<NotFoundError>).error).toBeInstanceOf(NotFoundError);
  });

  it('fails with OutOfStockError when the quantity exceeds the stock', async () => {
    const result = await build(product).execute(product.id, 3);

    expect((result as Err<OutOfStockError>).error).toBeInstanceOf(
      OutOfStockError,
    );
  });
});
