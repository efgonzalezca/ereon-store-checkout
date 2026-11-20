import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { PRODUCT_REPOSITORY } from '../src/modules/products/domain/product.repository.port';
import { createTestApp } from './create-test-app';

const productId = '00000000-0000-4000-8000-000000000001';

describe('Quote (e2e)', () => {
  const findById = jest.fn();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createTestApp({
      providerOverrides: [{ token: PRODUCT_REPOSITORY, value: { findById } }],
    });
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    findById.mockReset();
    findById.mockResolvedValue({
      id: productId,
      priceInCents: 8990000,
      stock: 5,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/quote returns the whole breakdown calculated by the backend', async () => {
    await request(server)
      .get('/api/quote')
      .query({ productId, quantity: 2 })
      .expect(200, {
        productAmountCents: 17980000,
        baseFeeCents: 300000,
        deliveryFeeCents: 1200000,
        totalAmountCents: 19480000,
      });
  });

  it.each([
    ['a quantity of 0', { productId, quantity: 0 }],
    ['a missing quantity', { productId }],
    ['a product id that is not a UUID', { productId: 'abc', quantity: 1 }],
    ['an unknown query parameter', { productId, quantity: 1, discount: 10 }],
  ])('returns 400 for %s', async (_name, query) => {
    await request(server).get('/api/quote').query(query).expect(400);
  });

  it('returns 404 for an unknown product and 409 without enough stock', async () => {
    findById.mockResolvedValueOnce(null);
    await request(server)
      .get('/api/quote')
      .query({ productId, quantity: 1 })
      .expect(404);

    await request(server)
      .get('/api/quote')
      .query({ productId, quantity: 6 })
      .expect(409);
  });
});
