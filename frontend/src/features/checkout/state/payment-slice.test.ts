import { AxiosError, AxiosResponse } from 'axios';
import { setupStore } from '@/app/store';
import { createFakeApi } from '@/test/render-with-store';
import {
  checkoutStarted,
  sectionChanged,
  transactionCreated,
} from './checkout-slice';
import { classifyError } from './payment-errors';
import { checkStatus, fetchQuote, submitPayment } from './payment-slice';
import { attemptClosed } from './checkout-slice';
import { SubmitPaymentArgs } from './payment.types';

const httpError = (status: number, data: unknown = {}) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

const args: SubmitPaymentArgs = {
  card: {
    number: '4242424242424242',
    cvc: '123',
    expMonth: '12',
    expYear: '30',
    holder: 'JANE DOE',
  },
  acceptanceToken: 'acc',
  personalAuthToken: 'personal',
};

const result = (status: string) => ({ data: { id: 'tx-1', status } });

function build(post: jest.Mock, get: jest.Mock = jest.fn()) {
  const store = setupStore({ api: createFakeApi(get, post) });
  store.dispatch(checkoutStarted({ productId: 'p-1', quantity: 2 }));
  return store;
}

describe('classifyError', () => {
  it.each([
    ['an unknown error', new Error('boom'), 'unexpected'],
    ['no response', new AxiosError('Network Error', 'ERR_NETWORK'), 'network'],
    ['404', httpError(404), 'not_found'],
    [
      '409 out of stock',
      httpError(409, { code: 'OUT_OF_STOCK' }),
      'out_of_stock',
    ],
    [
      '409 invalid state',
      httpError(409, { code: 'INVALID_TRANSACTION_STATE' }),
      'not_payable',
    ],
    ['409 without body', httpError(409, null), 'not_payable'],
    [
      '422 card rejected',
      httpError(422, { code: 'CARD_REJECTED' }),
      'card_rejected',
    ],
    ['422 another', httpError(422, { code: 'OTHER' }), 'unexpected'],
    ['429', httpError(429), 'rate_limited'],
    ['502', httpError(502), 'gateway'],
    ['500', httpError(500), 'unexpected'],
  ])('classifies %s as %s', (_name, error, kind) => {
    expect(classifyError(error)).toBe(kind);
  });
});

describe('payment slice', () => {
  it('requests the quote with the trace id and stores the amounts or the error kind', async () => {
    const amounts = { totalAmountCents: 1 };
    const get = jest
      .fn()
      .mockResolvedValueOnce({ data: amounts })
      .mockRejectedValueOnce(httpError(404));
    const store = build(jest.fn(), get);

    await store.dispatch(fetchQuote({ productId: 'p-1', quantity: 2 }));
    expect(get).toHaveBeenCalledWith('/api/quote', {
      params: { productId: 'p-1', quantity: 2 },
      headers: { 'X-Trace-Id': store.getState().checkout.traceId },
    });
    expect(store.getState().payment.quote).toMatchObject({
      status: 'succeeded',
      amounts,
    });

    await store.dispatch(fetchQuote({ productId: 'p-1', quantity: 2 }));
    expect(store.getState().payment.quote).toMatchObject({
      status: 'failed',
      error: 'not_found',
    });
  });

  it('reuses an existing transaction instead of creating another one', async () => {
    const post = jest.fn().mockResolvedValue(result('APPROVED'));
    const store = build(post);
    store.dispatch(transactionCreated('tx-1'));

    await store.dispatch(submitPayment(args));

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/api/transactions/tx-1/pay');
    expect(store.getState().payment.submission).toMatchObject({
      status: 'done',
      result: { status: 'APPROVED' },
    });
  });

  it('keeps the same transaction and returns to the card step after a retryable failure', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce(result('PENDING'))
      .mockRejectedValueOnce(httpError(502));
    const store = build(post);
    store.dispatch(sectionChanged(4));

    await store.dispatch(submitPayment(args));

    expect(store.getState().checkout).toMatchObject({
      transactionId: 'tx-1',
      formSection: 3,
    });
    expect(store.getState().payment.submission).toMatchObject({
      status: 'failed',
      error: 'gateway',
    });
  });

  it('keeps the payment attempt open when the result cannot be confirmed', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce(result('PENDING'))
      .mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'));
    const store = build(post);
    store.dispatch(sectionChanged(4));

    await store.dispatch(submitPayment(args));

    expect(store.getState().checkout).toMatchObject({
      formSection: 4,
      paymentAttempted: true,
    });
    expect(store.getState().payment.submission).toMatchObject({
      status: 'failed',
      error: 'network',
    });
  });

  it('leaves the payment attempt without going back to the card when the order cannot be paid', async () => {
    const post = jest
      .fn()
      .mockResolvedValueOnce(result('PENDING'))
      .mockRejectedValueOnce(httpError(409, { code: 'OUT_OF_STOCK' }));
    const store = build(post);
    store.dispatch(sectionChanged(4));

    await store.dispatch(submitPayment(args));

    expect(store.getState().checkout).toMatchObject({
      formSection: 4,
      paymentAttempted: false,
    });
  });

  it('keeps the attempt and the reference after a declined payment until the user chooses', async () => {
    const post = jest.fn().mockResolvedValue(result('DECLINED'));
    const store = build(post);
    store.dispatch(transactionCreated('tx-1'));
    const before = store.getState().checkout.reference;

    await store.dispatch(submitPayment(args));

    expect(store.getState().checkout).toMatchObject({
      reference: before,
      transactionId: 'tx-1',
      paymentAttempted: true,
    });

    store.dispatch(attemptClosed({ reference: 'ref-2' }));

    expect(store.getState().checkout).toMatchObject({
      reference: 'ref-2',
      transactionId: null,
      paymentAttempted: false,
    });
    expect(store.getState().payment.submission.status).toBe('idle');
  });

  it('checks the transaction status with the trace id and stores the result', async () => {
    const get = jest.fn().mockResolvedValue(result('APPROVED'));
    const store = build(jest.fn(), get);
    store.dispatch(transactionCreated('tx-1'));

    await store.dispatch(checkStatus());

    expect(get).toHaveBeenCalledWith('/api/transactions/tx-1', {
      headers: { 'X-Trace-Id': store.getState().checkout.traceId },
    });
    expect(store.getState().payment.submission).toMatchObject({
      status: 'done',
      result: { status: 'APPROVED' },
    });
  });

  it('reports a failed status check and does not check without a transaction', async () => {
    const get = jest.fn().mockRejectedValue(new AxiosError('x', 'ERR_NETWORK'));
    const store = build(jest.fn(), get);

    await store.dispatch(checkStatus());
    expect(get).not.toHaveBeenCalled();

    store.dispatch(transactionCreated('tx-1'));
    await store.dispatch(checkStatus());

    expect(store.getState().payment.submission).toMatchObject({
      status: 'failed',
      error: 'network',
    });
  });

  it('ignores a second submission while one is in progress', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const post = jest.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const store = build(post);
    store.dispatch(transactionCreated('tx-1'));

    const first = store.dispatch(submitPayment(args));
    await store.dispatch(submitPayment(args));
    finish(result('APPROVED'));
    await first;

    expect(post).toHaveBeenCalledTimes(1);
    expect(store.getState().payment.submission.status).toBe('done');
  });
});
