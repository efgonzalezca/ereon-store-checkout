import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { setupStore } from '@/app/store';
import { StorageLike } from '@/features/checkout/state/checkout-storage';
import { ThunkExtra } from '@/app/thunk-extra';
import { Product } from '@/features/products/state/product.types';

export const products: Product[] = [
  {
    id: 'p-1',
    name: 'Desk Lamp',
    description: 'LED desk lamp',
    priceInCents: 8990000,
    stock: 3,
    imageUrl: '/images/products/desk-lamp.webp',
  },
  {
    id: 'p-2',
    name: 'Limited Edition Backpack',
    description: 'Water-repellent backpack',
    priceInCents: 17990000,
    stock: 0,
    imageUrl: '/images/products/limited-backpack.webp',
  },
];

export function createFakeApi(
  get: jest.Mock,
  post: jest.Mock = jest.fn(),
): ThunkExtra['api'] {
  return { get, post } as unknown as ThunkExtra['api'];
}

export function renderWithStore(
  ui: ReactElement,
  get: jest.Mock,
  storage: StorageLike | null = null,
  post: jest.Mock = jest.fn(),
) {
  const store = setupStore({ api: createFakeApi(get, post) }, storage);
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
