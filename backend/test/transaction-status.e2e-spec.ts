import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { Transaction } from '../src/modules/transactions/domain/transaction';
import { TRANSACTION_REPOSITORY } from '../src/modules/transactions/domain/transaction.repository.port';
import { createTestApp } from './create-test-app';

const id = 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10';

const approved: Transaction = {
  id,
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  status: 'APPROVED',
  externalId: 'gw-1',
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  quantity: 1,
  installments: 2,
  productAmountCents: 8990000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 10490000,
  ipAddress: '203.0.113.7',
};

describe('Transaction status (e2e)', () => {
  const findById = jest.fn();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createTestApp({
      providerOverrides: [
        { token: TRANSACTION_REPOSITORY, value: { findById } },
      ],
    });
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/transactions/:id returns the status without internal data', async () => {
    findById.mockResolvedValueOnce(approved);

    await request(server).get(`/api/transactions/${id}`).expect(200, {
      id,
      reference: approved.reference,
      status: 'APPROVED',
      quantity: 1,
      installments: 2,
      productAmountCents: 8990000,
      baseFeeCents: 300000,
      deliveryFeeCents: 1200000,
      totalAmountCents: 10490000,
    });
  });

  it('returns 404 for an unknown transaction and 400 for an id that is not a UUID', async () => {
    findById.mockResolvedValueOnce(null);
    const missing = await request(server)
      .get(`/api/transactions/${id}`)
      .expect(404);
    expect(missing.body).toMatchObject({ code: 'NOT_FOUND' });

    await request(server).get('/api/transactions/abc').expect(400);
  });
});
