import axios, { AxiosInstance } from 'axios';

const REQUEST_TIMEOUT_MS = 15000;

export function createHttpClient(apiUrl: string): AxiosInstance {
  return axios.create({ baseURL: apiUrl, timeout: REQUEST_TIMEOUT_MS });
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}
