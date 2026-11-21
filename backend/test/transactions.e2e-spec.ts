import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { CUSTOMER_REPOSITORY } from '../src/modules/customers/domain/customer.repository.port';
import { PRODUCT_REPOSITORY } from '../src/modules/products/domain/product.repository.port';
import { Transaction } from '../src/modules/transactions/domain/transaction';
import { TRANSACTION_REPOSITORY } from '../src/modules/transactions/domain/transaction.repository.port';
import { ok } from '../src/shared/rop/result';
import { createTestApp } from './create-test-app';

const productId = '00000000-0000-4000-8000-000000000001';
const reference = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const body = {
  productId,
  quantity: 2,
  installments: 3,
  reference,
  customer: {
    documentType: 'CC',
    documentNumber: '1020304050',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+57 300 111 2233',
  },
};

const customer = {
  id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  ...body.customer,
};

describe('Transactions (e2e)', () => {
  const findById = jest.fn();
  const findByReference = jest.fn();
  const create = jest.fn();
  let app: INestApplication;
  let server: Server;

  const stored = (data: Record<string, unknown>): Transaction =>
    ({
      id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
      status: 'PENDING',
      ...data,
    }) as Transaction;

  beforeAll(async () => {
    app = await createTestApp({
      providerOverrides: [
        { token: PRODUCT_REPOSITORY, value: { findById } },
        {
          token: CUSTOMER_REPOSITORY,
          value: { upsert: () => Promise.resolve(customer) },
        },
        { token: TRANSACTION_REPOSITORY, value: { findByReference, create } },
      ],
    });
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue({
      id: productId,
      priceInCents: 8990000,
      stock: 5,
    });
    findByReference.mockResolvedValue(null);
    create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(ok(stored(data))),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/transactions creates a PENDING transaction with the amounts and no internal data', async () => {
    const response = await request(server)
      .post('/api/transactions')
      .send(body)
      .expect(201);

    expect(response.body).toEqual({
      id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
      reference,
      status: 'PENDING',
      quantity: 2,
      installments: 3,
      productAmountCents: 17980000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 19480000,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: expect.any(String) as string }),
    );
  });

  it.each([
    ['quantity 0', { quantity: 0 }],
    ['a missing customer', { customer: undefined }],
    ['installments 37', { installments: 37 }],
    [
      'an invalid document type',
      { customer: { ...body.customer, documentType: 'XX' } },
    ],
    ['an unknown field', { cardNumber: '4242424242424242' }],
  ])('POST /api/transactions returns 400 for %s', async (_name, change) => {
    await request(server)
      .post('/api/transactions')
      .send({ ...body, ...change })
      .expect(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown product and 409 without enough stock', async () => {
    findById.mockResolvedValueOnce(null);
    const missing = await request(server)
      .post('/api/transactions')
      .send(body)
      .expect(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND' });

    findById.mockResolvedValueOnce({
      id: productId,
      priceInCents: 8990000,
      stock: 1,
    });
    const noStock = await request(server)
      .post('/api/transactions')
      .send(body)
      .expect(409);
    expect(noStock.body).toMatchObject({ code: 'OUT_OF_STOCK' });
  });

  it('returns 422 when the reference belongs to a different request', async () => {
    findByReference.mockResolvedValueOnce(
      stored({
        productId,
        customerId: customer.id,
        quantity: 1,
        installments: 3,
      }),
    );

    const response = await request(server)
      .post('/api/transactions')
      .send(body)
      .expect(422);

    expect(response.body).toMatchObject({ code: 'DUPLICATE_REFERENCE' });
  });
});
