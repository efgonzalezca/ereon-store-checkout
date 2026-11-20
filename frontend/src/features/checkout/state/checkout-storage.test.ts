import { setupStore } from '@/app/store';
import { memoryStorage } from '@/test/memory-storage';
import { createFakeApi } from '@/test/render-with-store';
import {
  checkoutCancelled,
  checkoutStarted,
  customerChanged,
  initialCheckoutState,
} from './checkout-slice';
import {
  CHECKOUT_STORAGE_KEY,
  loadCheckoutState,
  parseCheckoutState,
  saveCheckoutState,
  StorageLike,
} from './checkout-storage';

describe('checkout storage', () => {
  it('persists the checkout and restores it on the next load', () => {
    const storage = memoryStorage();
    const store = setupStore({ api: createFakeApi(jest.fn()) }, storage);
    store.dispatch(checkoutStarted({ productId: 'p-1', quantity: 2 }));
    store.dispatch(customerChanged({ fullName: 'Jane Doe' }));

    const restored = setupStore({ api: createFakeApi(jest.fn()) }, storage);

    expect(restored.getState().checkout).toEqual(store.getState().checkout);
  });

  it('removes the stored checkout when it is cancelled', () => {
    const storage = memoryStorage();
    const store = setupStore({ api: createFakeApi(jest.fn()) }, storage);
    store.dispatch(checkoutStarted({ productId: 'p-1', quantity: 1 }));
    expect(storage.data[CHECKOUT_STORAGE_KEY]).toBeDefined();

    store.dispatch(checkoutCancelled());

    expect(storage.data[CHECKOUT_STORAGE_KEY]).toBeUndefined();
  });

  it.each([
    ['not json', '{oops'],
    ['an array', '[]'],
    ['a step without product', JSON.stringify({ step: 2 })],
    [
      'a legacy step 3',
      JSON.stringify({ step: 3, productId: 'p', traceId: 't' }),
    ],
  ])('falls back to the initial state for %s', (_name, stored) => {
    const storage = memoryStorage({ [CHECKOUT_STORAGE_KEY]: stored });

    expect(loadCheckoutState(storage)).toEqual(initialCheckoutState);
  });

  it('does not resume on the summary without a stored card', () => {
    const state = parseCheckoutState({
      step: 2,
      productId: 'p-1',
      traceId: 't-1',
      formSection: 4,
    });

    expect(state.formSection).toBe(3);
  });

  it('sanitizes tampered values', () => {
    const state = parseCheckoutState({
      step: 2,
      productId: 'p-1',
      traceId: 't-1',
      quantity: -4,
      installments: 99,
      customer: { documentType: 'XX', fullName: 7 },
      cardLast4: '12345',
      cardBrand: 'AMEX',
    });

    expect(state).toMatchObject({
      quantity: 1,
      installments: 1,
      cardLast4: null,
      cardBrand: null,
    });
    expect(state.customer).toMatchObject({ documentType: 'CC', fullName: '' });
  });

  it('keeps working when storage is unavailable', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => undefined,
    };

    expect(loadCheckoutState(broken)).toEqual(initialCheckoutState);
    expect(() =>
      saveCheckoutState(broken, { ...initialCheckoutState, step: 2 }),
    ).not.toThrow();
    expect(loadCheckoutState(null)).toEqual(initialCheckoutState);
  });
});
