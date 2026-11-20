import { StorageLike } from '@/features/checkout/state/checkout-storage';

export type MemoryStorage = StorageLike & { data: Record<string, string> };

export function memoryStorage(
  initial: Record<string, string> = {},
): MemoryStorage {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}
