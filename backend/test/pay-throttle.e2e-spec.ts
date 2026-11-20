import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { TRANSACTION_REPOSITORY } from '../src/modules/transactions/domain/transaction.repository.port';
import { createTestApp } from './create-test-app';

describe('Pay rate limit (e2e)', () => {
  const previousLimit = process.env.THROTTLE_PAY_LIMIT;
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    process.env.THROTTLE_PAY_LIMIT = '2';
    app = await createTestApp({
      providerOverrides: [
        {
          token: TRANSACTION_REPOSITORY,
          value: { findById: () => Promise.resolve(null) },
        },
      ],
    });
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    process.env.THROTTLE_PAY_LIMIT = previousLimit;
    await app.close();
  });

  it('limits POST /api/transactions/:id/pay more strictly than the rest of the API', async () => {
    const url = '/api/transactions/c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10/pay';

    await request(server).post(url).send({}).expect(400);
    await request(server).post(url).send({}).expect(400);
    await request(server).post(url).send({}).expect(429);

    await request(server).get('/api/health').expect(200);
  });
});
