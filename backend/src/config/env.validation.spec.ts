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
  };

  it('parses and converts a valid environment', () => {
    expect(validateEnv(validEnv)).toMatchObject({
      PORT: 3000,
      CORS_ORIGIN: ['http://localhost:5173', 'https://store.example.com'],
      THROTTLE_TTL: 60,
      DB_PORT: 5432,
      DB_SSL: true,
    });
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
