import { NotFoundError } from '../../../../shared/rop/errors';
import { Err, Ok } from '../../../../shared/rop/result';
import { Transaction } from '../../domain/transaction';
import { GetTransactionByIdUseCase } from './get-transaction-by-id.use-case';

const transaction: Transaction = {
  id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  status: 'PENDING',
  externalId: null,
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  quantity: 1,
  installments: 1,
  productAmountCents: 8990000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 10490000,
  ipAddress: null,
};

describe('GetTransactionByIdUseCase', () => {
  it('returns the transaction or NotFoundError', async () => {
    const findById = jest
      .fn()
      .mockResolvedValueOnce(transaction)
      .mockResolvedValueOnce(null);
    const useCase = new GetTransactionByIdUseCase({
      findById,
      findByReference: jest.fn(),
      create: jest.fn(),
      saveOutcome: jest.fn(),
    });

    expect(
      ((await useCase.execute(transaction.id)) as Ok<Transaction>).value,
    ).toBe(transaction);
    expect(
      ((await useCase.execute('missing')) as Err<NotFoundError>).error,
    ).toBeInstanceOf(NotFoundError);
  });
});
