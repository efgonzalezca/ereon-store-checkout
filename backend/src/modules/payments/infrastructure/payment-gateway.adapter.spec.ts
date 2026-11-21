import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { Logger } from 'nestjs-pino';
import { of, throwError } from 'rxjs';
import { EnvironmentVariables } from '../../../config/env.validation';
import { GatewayError } from '../../../shared/rop/errors';
import { Err, Ok } from '../../../shared/rop/result';
import { AcceptanceTokens } from '../domain/payment-gateway.port';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';

const PUBLIC_KEY = 'pub_test_mock_key';

const merchantInfo = {
  data: {
    id: 1,
    presigned_acceptance: {
      acceptance_token: 'acc_token',
      permalink: 'https://legal.test/terms',
      type: 'END_USER_POLICY',
    },
    presigned_personal_data_auth: {
      acceptance_token: 'personal_token',
      permalink: 'https://legal.test/data',
      type: 'PERSONAL_DATA_AUTH',
    },
  },
};

function build(get: jest.Mock) {
  const warn = jest.fn();
  const config = {
    get: (key: string) =>
      key === 'PAYMENT_API_URL' ? 'https://gateway.test' : PUBLIC_KEY,
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const adapter = new PaymentGatewayAdapter(
    { get } as unknown as HttpService,
    config,
    { warn } as unknown as Logger,
  );
  return { adapter, warn };
}

describe('PaymentGatewayAdapter', () => {
  it('maps the gateway response and sends the merchant key header', async () => {
    const get = jest.fn().mockReturnValue(of({ data: merchantInfo }));
    const { adapter } = build(get);

    const result = await adapter.getAcceptanceTokens();

    expect((result as Ok<AcceptanceTokens>).value).toEqual({
      acceptanceToken: 'acc_token',
      acceptancePermalink: 'https://legal.test/terms',
      personalAuthToken: 'personal_token',
      personalAuthPermalink: 'https://legal.test/data',
    });
    expect(get).toHaveBeenCalledWith(
      'https://gateway.test/v1/merchants/info',
      expect.objectContaining({
        headers: { 'x-merchant-public-key': PUBLIC_KEY },
        timeout: expect.any(Number) as number,
      }),
    );
  });

  it.each([
    ['timeout', () => new AxiosError('timeout', 'ECONNABORTED')],
    ['unexpected error', () => new Error('boom')],
  ])('returns GatewayError on %s without leaking the key', async (_n, make) => {
    const { adapter, warn } = build(
      jest.fn().mockReturnValue(throwError(make)),
    );

    const result = await adapter.getAcceptanceTokens();

    expect((result as Err<GatewayError>).error).toBeInstanceOf(GatewayError);
    expect(JSON.stringify([result, warn.mock.calls])).not.toContain(PUBLIC_KEY);
  });

  it('returns GatewayError when the response shape is unexpected', async () => {
    const { adapter, warn } = build(
      jest.fn().mockReturnValue(of({ data: { data: {} } })),
    );

    const result = await adapter.getAcceptanceTokens();

    expect((result as Err<GatewayError>).error).toBeInstanceOf(GatewayError);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'invalid_response' }),
      expect.any(String),
    );
  });
});
