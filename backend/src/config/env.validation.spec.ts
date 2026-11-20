import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    CORS_ORIGIN: 'http://localhost:5173, https://store.example.com',
    THROTTLE_TTL: '60',
    THROTTLE_LIMIT: '100',
    DB_HOST: 'db',
    DB_PORT: '5432',
    DB_USER: 'user',
    DB_PASS: 'pass',
    DB_NAME: 'name',
    DB_SSL: 'true',
    PAYMENT_API_URL: 'https://gateway.test',
    PAYMENT_PUBLIC_KEY: 'pub_test_mock_key',
    PAYMENT_PRIVATE_KEY: 'prv_test_mock_key',
    PAYMENT_INTEGRITY_KEY: 'test_integrity_mock_secret',
    PAYMENT_CURRENCY: 'COP',
    TRUST_PROXY_HOPS: '1',
    BASE_FEE_CENTS: '300000',
    DELIVERY_FEE_CENTS: '1200000',
  };

  it('parses and converts a valid environment', () => {
    expect(validateEnv(validEnv)).toMatchObject({
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173', 'https://store.example.com'],
      THROTTLE_TTL: 60,
      DB_PORT: 5432,
      DB_SSL: true,
      TRUST_PROXY_HOPS: 1,
      BASE_FEE_CENTS: 300000,
    });
  });

  it('requires the payment gateway settings', () => {
    const { PAYMENT_PUBLIC_KEY: _omitted, ...rest } = validEnv;
    const { PAYMENT_PRIVATE_KEY: _private, ...withoutPrivate } = validEnv;

    expect(() => validateEnv(rest)).toThrow(/PAYMENT_PUBLIC_KEY/);
    expect(() => validateEnv(withoutPrivate)).toThrow(/PAYMENT_PRIVATE_KEY/);
    expect(() => validateEnv({ ...validEnv, PAYMENT_CURRENCY: 'cop' })).toThrow(
      /PAYMENT_CURRENCY/,
    );
    expect(() =>
      validateEnv({ ...validEnv, PAYMENT_API_URL: 'ftp://gateway.test' }),
    ).toThrow(/PAYMENT_API_URL/);
  });

  it('requires non-negative integer fees and proxy hops', () => {
    expect(() => validateEnv({ ...validEnv, BASE_FEE_CENTS: '-1' })).toThrow(
      /BASE_FEE_CENTS/,
    );
    expect(() =>
      validateEnv({ ...validEnv, DELIVERY_FEE_CENTS: '1.5' }),
    ).toThrow(/DELIVERY_FEE_CENTS/);
    expect(() => validateEnv({ ...validEnv, TRUST_PROXY_HOPS: 'x' })).toThrow(
      /TRUST_PROXY_HOPS/,
    );
  });

  it('rejects a wildcard CORS origin', () => {
    expect(() => validateEnv({ ...validEnv, CORS_ORIGIN: '*' })).toThrow(
      /CORS_ORIGIN/,
    );
  });

  it('lists every invalid or missing variable without echoing values', () => {
    const { DB_PASS: _omitted, ...rest } = validEnv;

    expect(() =>
      validateEnv({ ...rest, NODE_ENV: 'staging', PORT: 'abc', DB_SSL: 'yes' }),
    ).toThrow(/NODE_ENV[\s\S]*PORT[\s\S]*DB_PASS[\s\S]*DB_SSL/);
    expect(() => validateEnv({ ...rest, PORT: 'abc' })).not.toThrow(/abc/);
  });
});
