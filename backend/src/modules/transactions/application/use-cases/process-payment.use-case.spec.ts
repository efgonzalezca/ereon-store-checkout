import { GetCustomerByIdUseCase } from '../../../customers/application/use-cases/get-customer-by-id.use-case';
import { Customer } from '../../../customers/domain/customer';
import {
  CardRejectedError,
  GatewayError,
  InvalidTransactionStateError,
  NotFoundError,
  OutOfStockError,
} from '../../../../shared/rop/errors';
import { Err, err, ok, Ok } from '../../../../shared/rop/result';
import { Transaction } from '../../domain/transaction';
import { GetQuoteUseCase } from './get-quote.use-case';
import {
  ProcessPaymentInput,
  ProcessPaymentUseCase,
} from './process-payment.use-case';

const customer: Customer = {
  id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  documentType: 'CC',
  documentNumber: '1020304050',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '3001112233',
};

const pending: Transaction = {
  id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  status: 'PENDING',
  externalId: null,
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: customer.id,
  quantity: 2,
  installments: 3,
  productAmountCents: 17980000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 19480000,
  ipAddress: null,
};

const input: ProcessPaymentInput = {
  transactionId: pending.id,
  card: {
    number: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '30',
    holder: 'JANE DOE',
  },
  shipping: {
    address: 'Calle 1 # 2-3',
    city: 'Bogota',
    region: 'Cundinamarca',
    postalCode: '110111',
  },
  acceptanceToken: 'acc_token',
  personalAuthToken: 'personal_token',
};

function build() {
  const findById = jest.fn().mockResolvedValue(pending);
  const saveOutcome = jest
    .fn()
    .mockImplementation((_id: string, outcome: object) =>
      Promise.resolve({ ...pending, ...outcome }),
    );
  const charge = jest
    .fn()
    .mockResolvedValue(ok({ status: 'APPROVED', externalId: 'gw-1' }));
  const settleApproved = jest
    .fn()
    .mockResolvedValue(
      ok({ ...pending, status: 'APPROVED', externalId: 'gw-1' }),
    );
  const getCustomer = jest.fn().mockResolvedValue(ok(customer));
  const getQuote = jest.fn().mockResolvedValue(ok({}));
  const useCase = new ProcessPaymentUseCase(
    { findById, findByReference: jest.fn(), create: jest.fn(), saveOutcome },
    { getAcceptanceTokens: jest.fn(), charge },
    { settleApproved },
    { execute: getCustomer } as unknown as GetCustomerByIdUseCase,
    { execute: getQuote } as unknown as GetQuoteUseCase,
  );
  return {
    useCase,
    findById,
    saveOutcome,
    charge,
    settleApproved,
    getCustomer,
    getQuote,
  };
}

describe('ProcessPaymentUseCase', () => {
  it('charges the stored amount and settles an approved payment', async () => {
    const { useCase, charge, settleApproved, saveOutcome } = build();

    const result = await useCase.execute(input);

    expect((result as Ok<Transaction>).value).toMatchObject({
      status: 'APPROVED',
      externalId: 'gw-1',
    });
    expect(charge).toHaveBeenCalledWith({
      reference: pending.reference,
      amountInCents: 19480000,
      installments: 3,
      customerEmail: 'jane@example.com',
      card: input.card,
      acceptanceToken: 'acc_token',
      personalAuthToken: 'personal_token',
    });
    expect(settleApproved).toHaveBeenCalledWith({
      transactionId: pending.id,
      externalId: 'gw-1',
      productId: pending.productId,
      customerId: customer.id,
      quantity: 2,
      shipping: input.shipping,
    });
    expect(saveOutcome).not.toHaveBeenCalled();
  });

  it.each(['DECLINED', 'ERROR', 'VOIDED', 'PENDING'])(
    'only stores the %s outcome, without touching stock or delivery',
    async (status) => {
      const { useCase, charge, saveOutcome, settleApproved } = build();
      charge.mockResolvedValue(ok({ status, externalId: 'gw-2' }));

      const result = await useCase.execute(input);

      expect((result as Ok<Transaction>).value).toMatchObject({
        status,
        externalId: 'gw-2',
      });
      expect(saveOutcome).toHaveBeenCalledWith(pending.id, {
        status,
        externalId: 'gw-2',
      });
      expect(settleApproved).not.toHaveBeenCalled();
    },
  );

  it('propagates a gateway failure and leaves the transaction untouched', async () => {
    const { useCase, charge, saveOutcome, settleApproved } = build();
    const failure = err(new GatewayError('down'));
    charge.mockResolvedValue(failure);

    expect(await useCase.execute(input)).toBe(failure);
    expect(saveOutcome).not.toHaveBeenCalled();
    expect(settleApproved).not.toHaveBeenCalled();
  });

  it('propagates a rejected card and leaves the transaction untouched', async () => {
    const { useCase, charge, saveOutcome } = build();
    const rejection = err(new CardRejectedError('rejected'));
    charge.mockResolvedValue(rejection);

    expect(await useCase.execute(input)).toBe(rejection);
    expect(saveOutcome).not.toHaveBeenCalled();
  });

  it.each([
    ['the stock ran out', new OutOfStockError('no stock')],
    ['the product disappeared', new NotFoundError('missing')],
  ])(
    'does not charge when %s before the payment starts',
    async (_name, error) => {
      const { useCase, getQuote, charge, saveOutcome } = build();
      getQuote.mockResolvedValue(err(error));

      const result = await useCase.execute(input);

      expect((result as Err<typeof error>).error).toBe(error);
      expect(getQuote).toHaveBeenCalledWith(
        pending.productId,
        pending.quantity,
      );
      expect(charge).not.toHaveBeenCalled();
      expect(saveOutcome).not.toHaveBeenCalled();
    },
  );

  it('propagates OutOfStockError when the stock is gone after the charge', async () => {
    const { useCase, settleApproved } = build();
    settleApproved.mockResolvedValue(err(new OutOfStockError('no stock')));

    const result = await useCase.execute(input);

    expect((result as Err<OutOfStockError>).error).toBeInstanceOf(
      OutOfStockError,
    );
  });

  it('returns NotFoundError for an unknown transaction without charging', async () => {
    const { useCase, findById, charge } = build();
    findById.mockResolvedValue(null);

    const result = await useCase.execute(input);

    expect((result as Err<NotFoundError>).error).toBeInstanceOf(NotFoundError);
    expect(charge).not.toHaveBeenCalled();
  });

  it.each([
    ['already approved', { status: 'APPROVED' }],
    ['with a charge already submitted', { externalId: 'gw-old' }],
  ])('refuses to pay a transaction %s', async (_name, change) => {
    const { useCase, findById, charge } = build();
    findById.mockResolvedValue({ ...pending, ...change });

    const result = await useCase.execute(input);

    expect((result as Err<InvalidTransactionStateError>).error).toBeInstanceOf(
      InvalidTransactionStateError,
    );
    expect(charge).not.toHaveBeenCalled();
  });

  it('fails without charging when the customer cannot be found', async () => {
    const { useCase, getCustomer, charge } = build();
    getCustomer.mockResolvedValue(err(new NotFoundError('customer')));

    const result = await useCase.execute(input);

    expect(result.isOk).toBe(false);
    expect(charge).not.toHaveBeenCalled();
  });
});
