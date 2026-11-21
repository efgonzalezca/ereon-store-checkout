import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Server } from 'node:http';
import request from 'supertest';
import { ProductOrmEntity } from '../src/modules/products/infrastructure/product.orm-entity';
import { createTestApp } from './create-test-app';

const row = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Wireless Headphones',
  description: 'Over-ear headphones',
  priceInCents: 129900,
  stock: 25,
  imageUrl: '/images/products/wireless-headphones.webp',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const product = {
  id: row.id,
  name: row.name,
  description: row.description,
  priceInCents: row.priceInCents,
  stock: row.stock,
  imageUrl: row.imageUrl,
};

describe('Products (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const repository = {
      find: () => Promise.resolve([row]),
      findOneBy: ({ id }: { id: string }) =>
        Promise.resolve(id === row.id ? row : null),
    };
    app = await createTestApp({
      providerOverrides: [
        { token: getRepositoryToken(ProductOrmEntity), value: repository },
      ],
    });
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/products lists the catalog without audit columns', async () => {
    await request(server).get('/api/products').expect(200, [product]);
  });

  it('GET /api/products/:id returns the product', async () => {
    await request(server).get(`/api/products/${row.id}`).expect(200, product);
  });

  it('GET /api/products/:id returns 404 for an unknown UUID and 400 for an invalid one', async () => {
    const missing = await request(server)
      .get('/api/products/00000000-0000-4000-8000-0000000000ff')
      .expect(404);
    expect(missing.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });

    await request(server).get('/api/products/not-a-uuid').expect(400);
  });
});
