import { AxiosError } from 'axios';
import { createHttpClient, getErrorMessage } from './http-client';

describe('http client', () => {
  it('creates a client bound to the API URL', () => {
    const client = createHttpClient('https://api.example.com');

    expect(client.defaults.baseURL).toBe('https://api.example.com');
    expect(client.defaults.timeout).toBeGreaterThan(0);
  });

  it('extracts a readable message from API, network and unknown errors', () => {
    const apiError = new AxiosError(
      'Request failed',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
        data: { message: 'Product not found' },
      },
    );

    expect(getErrorMessage(apiError)).toBe('Product not found');
    expect(getErrorMessage(new AxiosError('Network Error'))).toBe(
      'Network Error',
    );
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('???')).toBe('Unexpected error');
  });
});
