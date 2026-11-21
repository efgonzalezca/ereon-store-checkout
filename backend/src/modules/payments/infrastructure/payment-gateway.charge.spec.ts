import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { compactDecrypt } from 'jose';
import { Logger } from 'nestjs-pino';
import { of, throwError } from 'rxjs';
import { EnvironmentVariables } from '../../../config/env.validation';
import { CardRejectedError, GatewayError } from '../../../shared/rop/errors';
import { Err, Ok } from '../../../shared/rop/result';
import { ChargeRequest, ChargeResult } from '../domain/payment-gateway.port';
import { PaymentGatewayAdapter } from './payment-gateway.adapter';

const SETTINGS: Record<string, string> = {
  PAYMENT_API_URL: 'https://gateway.test',
  PAYMENT_PUBLIC_KEY: 'pub_test_mock_key',
  PAYMENT_PRIVATE_KEY: 'prv_test_mock_key',
  PAYMENT_INTEGRITY_KEY: 'test_integrity_mock_secret',
  PAYMENT_CURRENCY: 'COP',
};

const request: ChargeRequest = {
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  amountInCents: 10490000,
  installments: 3,
  customerEmail: 'jane@example.com',
  card: {
    number: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '99',
    holder: 'JANE DOE',
  },
  acceptanceToken: 'acc_token',
  personalAuthToken: 'personal_token',
};

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const gatewayPem = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString()
  .trim()
  .replace(/\n/g, ' ');

const keyResponse = { data: { data: { publicKey: gatewayPem } } };
const tokenResponse = { data: { data: { id: 'tok_test_123' } } };
const transaction = (status: string) => ({
  data: { data: { id: 'tx-external-1', status } },
});

function build(options: { get?: jest.Mock; post: jest.Mock }) {
  const warn = jest.fn();
  const get = options.get ?? jest.fn().mockReturnValue(of(keyResponse));
  const adapter = new PaymentGatewayAdapter(
    { get, post: options.post } as unknown as HttpService,
    { get: (key: string) => SETTINGS[key] } as unknown as ConfigService<
      EnvironmentVariables,
      true
    >,
    { warn } as unknown as Logger,
  );
  return { adapter, get, post: options.post, warn };
}

const postFlow = (...transactionResponses: unknown[]) => {
  const queue = [...transactionResponses];
  return jest.fn((url: string) =>
    url.endsWith('/v1/tokens/cards') ? of(tokenResponse) : of(queue.shift()),
  );
};

const httpError = (status: number, body: unknown) =>
  new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: body,
  } as AxiosResponse);

describe('PaymentGatewayAdapter.charge', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('encrypts the card, signs the charge and returns the approved result', async () => {
    const { adapter, get, post } = build({
      post: postFlow(transaction('APPROVED')),
    });

    const result = await adapter.charge(request);

    expect((result as Ok<ChargeResult>).value).toEqual({
      status: 'APPROVED',
      externalId: 'tx-external-1',
    });
    expect(get).toHaveBeenCalledWith(
      'https://gateway.test/v1/tokens/keys/tokenization',
      expect.objectContaining({
        headers: { Authorization: 'Bearer pub_test_mock_key' },
      }),
    );

    const [, cardBody, cardOptions] = post.mock.calls[0] as [
      string,
      { payload: string },
      { headers: unknown },
    ];
    expect(Object.keys(cardBody)).toEqual(['payload']);
    expect(cardOptions.headers).toEqual({
      Authorization: 'Bearer pub_test_mock_key',
    });
    const decrypted = await compactDecrypt(cardBody.payload, privateKey);
    expect(decrypted.protectedHeader).toMatchObject({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM',
    });
    expect(JSON.parse(new TextDecoder().decode(decrypted.plaintext))).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '99',
      card_holder: 'JANE DOE',
    });

    const [txUrl, txBody, txOptions] = post.mock.calls[1] as [
      string,
      Record<string, unknown>,
      { headers: unknown },
    ];
    expect(txUrl).toBe('https://gateway.test/v1/transactions');
    expect(txOptions.headers).toEqual({
      Authorization: 'Bearer prv_test_mock_key',
    });
    expect(txBody).toEqual({
      acceptance_token: 'acc_token',
      accept_personal_auth: 'personal_token',
      amount_in_cents: 10490000,
      currency: 'COP',
      signature: createHash('sha256')
        .update(`${request.reference}10490000COPtest_integrity_mock_secret`)
        .digest('hex'),
      customer_email: 'jane@example.com',
      reference: request.reference,
      payment_method_type: 'CARD',
      payment_method: { type: 'CARD', token: 'tok_test_123', installments: 3 },
    });
    expect(txBody).not.toHaveProperty('redirect_url');
  });

  it.each(['DECLINED', 'VOIDED', 'ERROR'])(
    'returns %s without polling',
    async (status) => {
      const { adapter, get } = build({ post: postFlow(transaction(status)) });

      const result = await adapter.charge(request);

      expect((result as Ok<ChargeResult>).value.status).toBe(status);
      expect(get).toHaveBeenCalledTimes(1);
    },
  );

  it('polls every 1.5 seconds until the status is final', async () => {
    jest.useFakeTimers();
    const get = jest
      .fn()
      .mockReturnValueOnce(of(keyResponse))
      .mockReturnValueOnce(of(transaction('PENDING')))
      .mockReturnValueOnce(of(transaction('APPROVED')));
    const { adapter } = build({ get, post: postFlow(transaction('PENDING')) });

    const pending = adapter.charge(request);
    await jest.advanceTimersByTimeAsync(3000);
    const result = await pending;

    expect((result as Ok<ChargeResult>).value.status).toBe('APPROVED');
    expect(get).toHaveBeenLastCalledWith(
      'https://gateway.test/v1/transactions/tx-external-1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer prv_test_mock_key' },
      }),
    );
  });

  it('reports PENDING with the external id when polling runs out or keeps failing', async () => {
    jest.useFakeTimers();
    const stillPending = jest
      .fn()
      .mockReturnValueOnce(of(keyResponse))
      .mockReturnValue(of(transaction('PENDING')));
    const first = build({
      get: stillPending,
      post: postFlow(transaction('PENDING')),
    });
    const exhausted = first.adapter.charge(request);
    await jest.advanceTimersByTimeAsync(10000);
    expect(((await exhausted) as Ok<ChargeResult>).value).toMatchObject({
      status: 'PENDING',
      externalId: 'tx-external-1',
    });
    expect(stillPending).toHaveBeenCalledTimes(1 + 4);

    const unreachable = jest
      .fn()
      .mockReturnValueOnce(of(keyResponse))
      .mockReturnValue(
        throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
      );
    const second = build({
      get: unreachable,
      post: postFlow(transaction('PENDING')),
    });
    const failing = second.adapter.charge(request);
    await jest.advanceTimersByTimeAsync(10000);
    expect(((await failing) as Ok<ChargeResult>).value).toMatchObject({
      status: 'PENDING',
      externalId: 'tx-external-1',
    });
    expect(second.warn).toHaveBeenCalled();
  });

  it('tokenizes the card again on every charge', async () => {
    const post = jest
      .fn()
      .mockReturnValueOnce(of(tokenResponse))
      .mockReturnValueOnce(of(transaction('APPROVED')))
      .mockReturnValueOnce(of(tokenResponse))
      .mockReturnValueOnce(of(transaction('APPROVED')));
    const { adapter, get } = build({ post });

    await adapter.charge(request);
    await adapter.charge(request);

    expect(get).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(4);
  });

  it('returns GatewayError without leaking secrets when tokenization fails', async () => {
    const { adapter, post, warn } = build({
      get: jest
        .fn()
        .mockReturnValue(
          throwError(() => new AxiosError('timeout', 'ECONNABORTED')),
        ),
      post: jest.fn(),
    });

    const result = await adapter.charge(request);

    expect((result as Err<GatewayError>).error).toBeInstanceOf(GatewayError);
    expect(post).not.toHaveBeenCalled();
    const exposed = JSON.stringify([result, warn.mock.calls]);
    for (const secret of [
      'prv_test_mock_key',
      'pub_test_mock_key',
      'test_integrity_mock_secret',
      '4242424242424242',
      'acc_token',
    ]) {
      expect(exposed).not.toContain(secret);
    }
  });

  it('returns GatewayError and logs the step and the rejected fields when the charge is rejected', async () => {
    const post = jest.fn((url: string) =>
      url.endsWith('/v1/tokens/cards')
        ? of(tokenResponse)
        : throwError(() =>
            httpError(422, {
              error: {
                type: 'INPUT_VALIDATION_ERROR',
                messages: { acceptance_token: ['Token inválido'] },
              },
            }),
          ),
    );
    const { adapter, warn } = build({ post });

    const result = await adapter.charge(request);

    expect((result as Err<GatewayError>).error).toBeInstanceOf(GatewayError);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'charge_failed',
        step: 'create_transaction',
        reason: 'ERR_BAD_REQUEST:422',
        gatewayErrorType: 'INPUT_VALIDATION_ERROR',
        gatewayErrorFields: ['acceptance_token'],
      }),
      expect.any(String),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Token inválido');
  });

  it('returns CardRejectedError when the gateway rejects the card during tokenization', async () => {
    const post = jest.fn().mockReturnValue(
      throwError(() =>
        httpError(422, {
          error: {
            type: 'INPUT_VALIDATION_ERROR',
            messages: { number: ['El número de tarjeta no es aceptado'] },
          },
        }),
      ),
    );
    const { adapter, warn } = build({ post });

    const result = await adapter.charge(request);

    expect((result as Err<CardRejectedError>).error).toBeInstanceOf(
      CardRejectedError,
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'card_rejected',
        step: 'tokenize_card',
        gatewayErrorFields: ['number'],
      }),
      expect.any(String),
    );
    const exposed = JSON.stringify(warn.mock.calls);
    expect(exposed).not.toContain('4242424242424242');
    expect(exposed).not.toContain('no es aceptado');
  });

  it.each([
    ['an unknown status', transaction('WEIRD')],
    ['a missing id', { data: { data: { status: 'APPROVED' } } }],
  ])('returns GatewayError for %s', async (_name, response) => {
    const { adapter } = build({ post: postFlow(response) });

    const result = await adapter.charge(request);

    expect((result as Err<GatewayError>).error).toBeInstanceOf(GatewayError);
  });

  it('returns GatewayError when the gateway sends no usable key or token', async () => {
    const noKey = build({
      get: jest.fn().mockReturnValue(of({ data: { data: {} } })),
      post: jest.fn(),
    });
    expect(
      ((await noKey.adapter.charge(request)) as Err<GatewayError>).error,
    ).toBeInstanceOf(GatewayError);

    const noToken = build({
      post: jest.fn().mockReturnValue(of({ data: { data: {} } })),
    });
    expect(
      ((await noToken.adapter.charge(request)) as Err<GatewayError>).error,
    ).toBeInstanceOf(GatewayError);
  });
});
