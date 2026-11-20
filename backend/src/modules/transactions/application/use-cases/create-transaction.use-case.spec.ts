import { Customer } from '../../../customers/domain/customer';
import { FindOrCreateCustomerUseCase } from '../../../customers/application/use-cases/find-or-create-customer.use-case';
import {
  DuplicateReferenceError,
  NotFoundError,
  OutOfStockError,
} from '../../../../shared/rop/errors';
import { Err, err, ok, Ok } from '../../../../shared/rop/result';
import { GetQuoteUseCase } from './get-quote.use-case';
import { Transaction } from '../../domain/transaction';
import {
  CreateTransactionInput,
  CreateTransactionUseCase,
} from './create-transaction.use-case';

const customer: Customer = {
  id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  documentType: 'CC',
  documentNumber: '1020304050',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '3001112233',
};

const input: CreateTransactionInput = {
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  productId: '00000000-0000-4000-8000-000000000001',
  quantity: 2,
  installments: 3,
  customer: {
    documentType: customer.documentType,
    documentNumber: customer.documentNumber,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
  },
  ipAddress: '203.0.113.7',
};

const amounts = {
  productAmountCents: 17980000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 19480000,
};

const stored: Transaction = {
  id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
  reference: input.reference,
  status: 'PENDING',
  externalId: null,
  productId: input.productId,
  customerId: customer.id,
  quantity: 2,
  installments: 3,
  productAmountCents: 17980000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 19480000,
  ipAddress: '203.0.113.7',
};

function build() {
  const quote = jest.fn().mockResolvedValue(ok(amounts));
  const findByReference = jest.fn().mockResolvedValue(null);
  const create = jest.fn().mockResolvedValue(ok(stored));
  const execute = jest.fn().mockResolvedValue(ok(customer));
  const useCase = new CreateTransactionUseCase(
    { findById: jest.fn(), findByReference, create, saveOutcome: jest.fn() },
    { execute: quote } as unknown as GetQuoteUseCase,
    { execute } as unknown as FindOrCreateCustomerUseCase,
  );
  return { useCase, quote, findByReference, create, execute };
}

describe('CreateTransactionUseCase', () => {
  it('creates a PENDING transaction with the quoted amounts', async () => {
    const { useCase, create } = build();

    const result = await useCase.execute(input);

    expect((result as Ok<Transaction>).value).toBe(stored);
    expect(create).toHaveBeenCalledWith({
      reference: input.reference,
      productId: input.productId,
      customerId: customer.id,
      quantity: 2,
      installments: 3,
      ipAddress: '203.0.113.7',
      productAmountCents: 17980000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 19480000,
    });
  });

  it.each([
    ['an unknown product', new NotFoundError('missing')],
    ['not enough stock', new OutOfStockError('no stock')],
  ])(
    'propagates the quote error for %s without touching the customer',
    async (_n, error) => {
      const { useCase, quote, execute, create } = build();
      quote.mockResolvedValue(err(error));

      const result = await useCase.execute(input);

      expect((result as Err<typeof error>).error).toBe(error);
      expect(execute).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('returns the existing transaction when the same request is retried', async () => {
    const { useCase, findByReference, quote, create } = build();
    findByReference.mockResolvedValue(stored);

    const result = await useCase.execute(input);

    expect((result as Ok<Transaction>).value).toBe(stored);
    expect(create).not.toHaveBeenCalled();
    expect(quote).not.toHaveBeenCalled();
  });

  it.each([
    ['another quantity', { quantity: 1 }],
    ['another installments value', { installments: 1 }],
    ['another product', { productId: '00000000-0000-4000-8000-000000000002' }],
  ])('rejects a reused reference with %s', async (_name, change) => {
    const { useCase, findByReference } = build();
    findByReference.mockResolvedValue(stored);

    const result = await useCase.execute({ ...input, ...change });

    expect((result as Err<DuplicateReferenceError>).error).toBeInstanceOf(
      DuplicateReferenceError,
    );
  });

  it('rejects a reused reference that belongs to another customer', async () => {
    const { useCase, findByReference, execute } = build();
    findByReference.mockResolvedValue(stored);
    execute.mockResolvedValue(ok({ ...customer, id: 'another-customer' }));

    const result = await useCase.execute(input);

    expect(result.isOk).toBe(false);
  });

  it('treats losing a race on the same reference as a retry', async () => {
    const { useCase, findByReference, create } = build();
    findByReference.mockResolvedValueOnce(null).mockResolvedValueOnce(stored);
    create.mockResolvedValue(err(new DuplicateReferenceError('taken')));

    const result = await useCase.execute(input);

    expect((result as Ok<Transaction>).value).toBe(stored);
  });

  it('surfaces the duplicate error when the winner cannot be found', async () => {
    const { useCase, create } = build();
    const failure = err(new DuplicateReferenceError('taken'));
    create.mockResolvedValue(failure);

    expect(await useCase.execute(input)).toBe(failure);
  });
});
