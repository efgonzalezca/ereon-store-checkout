import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';
import { AxiosError } from 'axios';
import { Server } from 'node:http';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import { createTestApp } from './create-test-app';

const gatewayResponse = {
  data: {
    presigned_acceptance: {
      acceptance_token: 'acc_token',
      permalink: 'https://legal.test/terms',
    },
    presigned_personal_data_auth: {
      acceptance_token: 'personal_token',
      permalink: 'https://legal.test/data',
    },
  },
};

describe('Payments (e2e)', () => {
  const get = jest.fn();
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    app = await createTestApp({
      providerOverrides: [{ token: HttpService, value: { get } }],
    });
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/payments/acceptance-tokens returns the four fields', async () => {
    get.mockReturnValueOnce(of({ data: gatewayResponse }));

    await request(server).get('/api/payments/acceptance-tokens').expect(200, {
      acceptanceToken: 'acc_token',
      acceptancePermalink: 'https://legal.test/terms',
      personalAuthToken: 'personal_token',
      personalAuthPermalink: 'https://legal.test/data',
    });
  });

  it('returns 502 without exposing the merchant key when the gateway fails', async () => {
    get.mockReturnValueOnce(
      throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
    );

    const response = await request(server)
      .get('/api/payments/acceptance-tokens')
      .expect(502);

    expect(response.body).toMatchObject({
      statusCode: 502,
      code: 'GATEWAY_ERROR',
    });
    expect(JSON.stringify(response.body)).not.toContain('pub_test_mock_key');
  });
});
