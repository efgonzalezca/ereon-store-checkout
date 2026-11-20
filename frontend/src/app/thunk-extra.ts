import { AxiosInstance } from 'axios';

export interface ThunkExtra {
  api: Pick<AxiosInstance, 'get' | 'post'>;
}
