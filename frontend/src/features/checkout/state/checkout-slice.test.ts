import { setupStore } from '@/app/store';
import { createFakeApi } from '@/test/render-with-store';
import {
  checkoutCancelled,
  checkoutStarted,
  customerChanged,
  detailsSubmitted,
  fetchAcceptanceTokens,
  initialCheckoutState,
} from './checkout-slice';

describe('checkout slice', () => {
  it('starts a fresh checkout with a trace id and clears it on cancel', () => {
    const store = setupStore({ api: createFakeApi(jest.fn()) });
    store.dispatch(customerChanged({ fullName: 'Old Draft' }));

    store.dispatch(checkoutStarted({ productId: 'p-1', quantity: 2 }));
    const started = store.getState().checkout;
    expect(started).toMatchObject({ step: 2, productId: 'p-1', quantity: 2 });
    expect(started.traceId).toMatch(/^[0-9a-f-]{36}$/);
    expect(started.customer.fullName).toBe('');

    store.dispatch(detailsSubmitted({ last4: '4242', brand: 'VISA' }));
    expect(store.getState().checkout).toMatchObject({
      step: 2,
      formSection: 4,
      cardLast4: '4242',
      cardBrand: 'VISA',
    });

    store.dispatch(checkoutCancelled());
    expect(store.getState().checkout).toEqual(initialCheckoutState);
  });

  it('requests acceptance tokens sending the trace id', async () => {
    const tokens = { acceptanceToken: 'a' };
    const get = jest.fn().mockResolvedValue({ data: tokens });
    const store = setupStore({ api: createFakeApi(get) });
    store.dispatch(checkoutStarted({ productId: 'p-1', quantity: 1 }));

    const result = await store.dispatch(fetchAcceptanceTokens());

    expect(result.payload).toBe(tokens);
    expect(get).toHaveBeenCalledWith('/api/payments/acceptance-tokens', {
      headers: { 'X-Trace-Id': store.getState().checkout.traceId },
    });
  });

  it('rejects with a readable message when the request fails', async () => {
    const get = jest.fn().mockRejectedValue(new Error('network down'));
    const store = setupStore({ api: createFakeApi(get) });

    const result = await store.dispatch(fetchAcceptanceTokens());

    expect(result.payload).toBe('network down');
  });
});
