import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { CUSTOMER_REPOSITORY } from '../src/modules/customers/domain/customer.repository.port';
import { PRODUCT_REPOSITORY } from '../src/modules/products/domain/product.repository.port';
import { PAYMENT_GATEWAY } from '../src/modules/payments/domain/payment-gateway.port';
import { PAYMENT_SETTLEMENT } from '../src/modules/transactions/domain/payment-settlement.port';
import { Transaction } from '../src/modules/transactions/domain/transaction';
import { TRANSACTION_REPOSITORY } from '../src/modules/transactions/domain/transaction.repository.port';
import {
  CardRejectedError,
  GatewayError,
  OutOfStockError,
} from '../src/shared/rop/errors';
import { err, ok } from '../src/shared/rop/result';
import { createTestApp } from './create-test-app';

const id = 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10';

const pending: Transaction = {
  id,
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  status: 'PENDING',
  externalId: null,
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  quantity: 1,
  installments: 2,
  productAmountCents: 8990000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 10490000,
  ipAddress: null,
};

const body = {
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

describe('Pay (e2e)', () => {
  const findById = jest.fn();
  const saveOutcome = jest.fn();
  const charge = jest.fn();
  const settleApproved = jest.fn();
  const findProduct = jest.fn();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createTestApp({
      providerOverrides: [
        {
          token: TRANSACTION_REPOSITORY,
          value: { findById, saveOutcome },
        },
        {
          token: CUSTOMER_REPOSITORY,
          value: {
            findById: () => Promise.resolve({ email: 'jane@example.com' }),
          },
        },
        { token: PRODUCT_REPOSITORY, value: { findById: findProduct } },
        { token: PAYMENT_GATEWAY, value: { charge } },
        { token: PAYMENT_SETTLEMENT, value: { settleApproved } },
      ],
    });
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(pending);
    findProduct.mockResolvedValue({
      id: pending.productId,
      priceInCents: 1,
      stock: 5,
    });
    charge.mockResolvedValue(ok({ status: 'APPROVED', externalId: 'gw-1' }));
    settleApproved.mockResolvedValue(
      ok({ ...pending, status: 'APPROVED', externalId: 'gw-1' }),
    );
    saveOutcome.mockImplementation((_id: string, outcome: object) =>
      Promise.resolve({ ...pending, ...outcome }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/transactions/:id/pay returns 200 with the final status for every outcome', async () => {
    const approved = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(200);
    expect(approved.body).toEqual({
      id,
      reference: pending.reference,
      status: 'APPROVED',
      quantity: 1,
      installments: 2,
      productAmountCents: 8990000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 10490000,
    });

    charge.mockResolvedValue(ok({ status: 'DECLINED', externalId: 'gw-2' }));
    const declined = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(200);
    expect(declined.body).toMatchObject({ status: 'DECLINED' });
    expect(JSON.stringify(declined.body)).not.toContain('4242');
  });

  it.each([
    ['a missing card', { card: undefined }],
    ['a card number with letters', { card: { ...body.card, number: '42ab' } }],
    [
      'an invalid postal code',
      { shipping: { ...body.shipping, postalCode: '1' } },
    ],
    ['an unknown field', { amountInCents: 1 }],
  ])('returns 400 for %s', async (_name, change) => {
    await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send({ ...body, ...change })
      .expect(400);
    expect(charge).not.toHaveBeenCalled();
  });

  it('returns 400 for an id that is not a UUID and 404 for an unknown transaction', async () => {
    await request(server)
      .post('/api/transactions/abc/pay')
      .send(body)
      .expect(400);

    findById.mockResolvedValue(null);
    const missing = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns 409 when the transaction is no longer payable or the stock is gone, and 502 when the gateway fails', async () => {
    findById.mockResolvedValueOnce({ ...pending, status: 'APPROVED' });
    const notPayable = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(409);
    expect(notPayable.body).toMatchObject({
      code: 'INVALID_TRANSACTION_STATE',
    });

    findProduct.mockResolvedValueOnce({
      id: pending.productId,
      priceInCents: 1,
      stock: 0,
    });
    const noStockBefore = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(409);
    expect(noStockBefore.body).toMatchObject({ code: 'OUT_OF_STOCK' });
    expect(charge).not.toHaveBeenCalled();

    settleApproved.mockResolvedValueOnce(err(new OutOfStockError('no stock')));
    await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(409);

    charge.mockResolvedValueOnce(err(new GatewayError('down')));
    const gateway = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(502);
    expect(gateway.body).toMatchObject({ code: 'GATEWAY_ERROR' });

    charge.mockResolvedValueOnce(err(new CardRejectedError('rejected')));
    const rejected = await request(server)
      .post(`/api/transactions/${id}/pay`)
      .send(body)
      .expect(422);
    expect(rejected.body).toMatchObject({ code: 'CARD_REJECTED' });
  });
});
