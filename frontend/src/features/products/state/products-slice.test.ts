import { setupStore } from '@/app/store';
import { createFakeApi, products } from '@/test/render-with-store';
import {
  fetchProducts,
  productSelected,
  selectionCleared,
  selectSelectedProduct,
} from './products-slice';

describe('productsSlice', () => {
  it('stores the fetched products and lets one be selected and cleared', async () => {
    const get = jest.fn().mockResolvedValue({ data: products });
    const store = setupStore({ api: createFakeApi(get) });

    await store.dispatch(fetchProducts());
    store.dispatch(productSelected('p-1'));

    expect(get).toHaveBeenCalledWith('/api/products');
    expect(store.getState().products.status).toBe('succeeded');
    expect(selectSelectedProduct(store.getState())?.name).toBe('Desk Lamp');

    store.dispatch(selectionCleared());
    expect(selectSelectedProduct(store.getState())).toBeNull();
  });

  it('stores the error message when the request fails', async () => {
    const get = jest.fn().mockRejectedValue(new Error('Network Error'));
    const store = setupStore({ api: createFakeApi(get) });

    await store.dispatch(fetchProducts());

    expect(store.getState().products).toMatchObject({
      status: 'failed',
      error: 'Network Error',
      items: [],
    });
  });

  it('does not fire a second request while one is in flight', async () => {
    const get = jest.fn().mockResolvedValue({ data: products });
    const store = setupStore({ api: createFakeApi(get) });

    await Promise.all([
      store.dispatch(fetchProducts()),
      store.dispatch(fetchProducts()),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
  });
});
