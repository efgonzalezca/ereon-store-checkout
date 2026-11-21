import { parseEnv } from './env';

describe('parseEnv', () => {
  it('returns the API URL without trailing slashes', () => {
    expect(parseEnv({ VITE_API_URL: ' https://api.example.com/// ' })).toEqual({
      apiUrl: 'https://api.example.com',
    });
  });

  it('rejects a missing, malformed or non-http API URL', () => {
    expect(() => parseEnv({})).toThrow('required');
    expect(() => parseEnv({ VITE_API_URL: 'not a url' })).toThrow('valid URL');
    expect(() => parseEnv({ VITE_API_URL: 'ftp://host' })).toThrow('http');
  });
});
