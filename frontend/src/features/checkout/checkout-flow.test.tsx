import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosResponse } from 'axios';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { products, renderWithStore } from '@/test/render-with-store';
import { memoryStorage } from '@/test/memory-storage';
import { CHECKOUT_STORAGE_KEY } from './state/checkout-storage';

const tokens = {
  acceptanceToken: 'acc_token_secret',
  acceptancePermalink: 'https://legal.test/terms',
  personalAuthToken: 'personal_token_secret',
  personalAuthPermalink: 'https://legal.test/data',
};

const amounts = {
  productAmountCents: 8990000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 10490000,
};

const transaction = (status: string) => ({
  id: 'tx-1',
  reference: 'ref-1',
  status,
  quantity: 1,
  installments: 1,
  ...amounts,
});

const httpError = (status: number, data: unknown = {}) =>
  new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

function createApi(options: { tokens?: 'ok' | 'fail'; quote?: unknown } = {}) {
  return jest.fn((url: string) => {
    if (url === '/api/products') return Promise.resolve({ data: products });
    if (url === '/api/quote') {
      return options.quote instanceof Error
        ? Promise.reject(options.quote)
        : Promise.resolve({ data: options.quote ?? amounts });
    }
    return options.tokens === 'fail'
      ? Promise.reject(new Error('gateway down'))
      : Promise.resolve({ data: tokens });
  });
}

function createPost(outcome: string | Error = 'APPROVED') {
  return jest.fn((url: string) => {
    if (url === '/api/transactions') {
      return Promise.resolve({ data: transaction('PENDING') });
    }
    return outcome instanceof Error
      ? Promise.reject(outcome)
      : Promise.resolve({ data: transaction(outcome) });
  });
}

async function openCheckout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /desk lamp/i }));
  await user.click(
    await screen.findByRole('button', { name: /pay with credit card/i }),
  );
  return screen.findByRole('dialog', { name: /checkout/i });
}

type User = ReturnType<typeof userEvent.setup>;

async function fillPersonal(user: User, dialog: HTMLElement) {
  const form = within(dialog);
  await user.type(form.getByLabelText('Document number'), '1020304050');
  await user.type(form.getByLabelText('Full name'), 'Jane Doe');
  await user.type(form.getByLabelText('Email'), 'jane@example.com');
  await user.type(form.getByLabelText('Phone'), '3001112233');
}

async function fillShipping(user: User, dialog: HTMLElement) {
  const form = within(dialog);
  await user.type(form.getByLabelText('Address'), 'Calle 1 # 2-3');
  await user.type(form.getByLabelText('City'), 'Bogota');
  await user.type(form.getByLabelText('Region'), 'Cundinamarca');
  await user.type(form.getByLabelText('Postal code'), '110111');
}

async function fillCard(user: User, dialog: HTMLElement) {
  const form = within(dialog);
  await user.type(form.getByLabelText('Card number'), '4242424242424242');
  await user.type(form.getByLabelText('Name on card'), 'JANE DOE');
  await user.type(form.getByLabelText(/expiry/i), '1299');
  await user.type(form.getByLabelText('CVC'), '123');
}

async function goToSummary(user: User, dialog: HTMLElement) {
  await goToCardStep(user, dialog);
  await fillCard(user, dialog);
  await waitFor(() =>
    expect(within(dialog).getByRole('checkbox')).toBeEnabled(),
  );
  await user.click(within(dialog).getByRole('checkbox'));
  await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
  await within(dialog).findByText('Total');
}

async function next(user: User, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: 'Next' }));
}

async function goToCardStep(user: User, dialog: HTMLElement) {
  await fillPersonal(user, dialog);
  await next(user, dialog);
  await fillShipping(user, dialog);
  await next(user, dialog);
}

describe('checkout modal', () => {
  it('opens on the personal info step with a three-step progress indicator', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />, createApi());

    const dialog = await openCheckout(user);

    const steps = within(dialog).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      '1Personal info',
      '2Shipping info',
      '3Card info',
      '4Summary',
    ]);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
    expect(within(dialog).getByLabelText('Full name')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Address')).toBeNull();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument();
  });

  it('blocks "Next" with inline errors until the current step is valid', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);

    await next(user, dialog);

    expect(
      within(dialog).getAllByText('This field is required').length,
    ).toBeGreaterThan(1);
    expect(within(dialog).getByLabelText('Document number')).toHaveFocus();
    expect(store.getState().checkout.formSection).toBe(1);

    await fillPersonal(user, dialog);
    await next(user, dialog);

    expect(store.getState().checkout.formSection).toBe(2);
    expect(within(dialog).getByLabelText('Address')).toBeInTheDocument();
  });

  it('goes back keeping the data, from the button and from the progress indicator', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    expect(store.getState().checkout.formSection).toBe(3);

    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(within(dialog).getByLabelText('City')).toHaveValue('Bogota');

    await user.click(
      within(dialog).getByRole('button', { name: /personal info/i }),
    );
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Jane Doe');
  });

  it('loads fresh tokens and gates "Continue" on the terms in the card step', async () => {
    const user = userEvent.setup();
    const get = createApi();
    const { store } = renderWithStore(<App />, get);
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);

    const checkbox = within(dialog).getByRole('checkbox');
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(get).toHaveBeenCalledWith('/api/payments/acceptance-tokens', {
      headers: { 'X-Trace-Id': store.getState().checkout.traceId },
    });
    expect(
      within(dialog).getByRole('link', { name: 'terms and conditions' }),
    ).toHaveAttribute('target', '_blank');

    await fillCard(user, dialog);
    const submit = within(dialog).getByRole('button', { name: 'Continue' });
    expect(submit).toBeDisabled();
    await user.click(checkbox);
    expect(submit).toBeEnabled();
  });

  it('shows card errors and keeps the user on the step when the card is invalid', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    const form = within(dialog);
    await waitFor(() => expect(form.getByRole('checkbox')).toBeEnabled());
    await user.click(form.getByRole('checkbox'));
    await user.type(form.getByLabelText('Card number'), '4242424242424241');

    await user.click(form.getByRole('button', { name: 'Continue' }));

    expect(form.getByText('The card number is not valid')).toBeInTheDocument();
    expect(form.getByLabelText('Card number')).toHaveFocus();
    expect(store.getState().checkout.step).toBe(2);
  });

  it('rejects brands other than Visa and Mastercard and shows the brand logo', async () => {
    const user = userEvent.setup();
    renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    const input = within(dialog).getByLabelText('Card number');

    await user.type(input, '4242');
    expect(within(dialog).getByRole('img', { name: 'Visa' })).toBeVisible();

    await user.clear(input);
    await user.type(input, '5555');
    expect(
      within(dialog).getByRole('img', { name: 'Mastercard' }),
    ).toBeVisible();

    await user.clear(input);
    await user.type(input, '378282246310005');
    await user.tab();
    expect(
      within(dialog).getByText('Only Visa and Mastercard are accepted'),
    ).toBeInTheDocument();
  });

  it('shows the breakdown calculated by the backend and never persists the card or the tokens', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const get = createApi();
    const { store } = renderWithStore(<App />, get, storage);
    const dialog = await openCheckout(user);

    await goToSummary(user, dialog);

    expect(store.getState().checkout).toMatchObject({
      step: 2,
      formSection: 4,
      cardLast4: '4242',
      cardBrand: 'VISA',
    });
    expect(get).toHaveBeenCalledWith('/api/quote', {
      params: { productId: 'p-1', quantity: 1 },
      headers: { 'X-Trace-Id': store.getState().checkout.traceId },
    });
    const form = within(dialog);
    expect(form.getByText('Product').nextSibling).toHaveTextContent('$ 89.900');
    expect(form.getByText('Base fee').nextSibling).toHaveTextContent('$ 3.000');
    expect(form.getByText('Delivery fee').nextSibling).toHaveTextContent(
      '$ 12.000',
    );
    expect(form.getByText('Total').nextSibling).toHaveTextContent('$ 104.900');
    expect(form.getByText('•••• 4242')).toBeInTheDocument();
    expect(form.getByText('Calle 1 # 2-3')).toBeInTheDocument();
    expect(
      form.getByRole('button', { name: /^Pay .*104\.900$/ }),
    ).toBeEnabled();

    const persisted = storage.data[CHECKOUT_STORAGE_KEY];
    expect(persisted).toContain('4242');
    for (const secret of [
      '4242424242424242',
      '4242 4242 4242 4242',
      '123"',
      '12/99',
      'JANE DOE',
      tokens.acceptanceToken,
      tokens.personalAuthToken,
    ]) {
      expect(persisted).not.toContain(secret);
    }

    await user.click(form.getByRole('button', { name: 'Edit shipping info' }));
    expect(form.getByLabelText('City')).toHaveValue('Bogota');
  });

  it('lets the user jump between steps and marks only the complete ones', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);
    const form = within(dialog);

    await user.click(form.getByRole('button', { name: /card info/i }));
    expect(store.getState().checkout.formSection).toBe(3);
    expect(form.getByRole('button', { name: /summary/i })).toBeDisabled();

    await user.click(form.getByRole('button', { name: /personal info/i }));
    await fillPersonal(user, dialog);
    await user.click(form.getByRole('button', { name: /shipping info/i }));

    const items = form.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      '✓Personal info',
      '2Shipping info',
      '3Card info',
      '4Summary',
    ]);
  });

  it('resumes the same step after a reload, without card data and with fresh tokens', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const first = renderWithStore(<App />, createApi(), storage);
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    await user.type(within(dialog).getByLabelText('Card number'), '4242');
    first.unmount();

    const get = createApi();
    renderWithStore(<App />, get, storage);

    const restored = await screen.findByRole('dialog', { name: /checkout/i });
    expect(within(restored).getByLabelText('Card number')).toHaveValue('');
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/api/payments/acceptance-tokens',
        expect.anything(),
      ),
    );
    await user.click(within(restored).getByRole('button', { name: 'Back' }));
    expect(within(restored).getByLabelText('City')).toHaveValue('Bogota');
  });

  it('jumps back to the step with a problem when an earlier step is no longer valid', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const first = renderWithStore(<App />, createApi(), storage);
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    first.unmount();
    const stored = JSON.parse(storage.data[CHECKOUT_STORAGE_KEY]) as {
      customer: { email: string };
    };
    stored.customer.email = 'broken';
    storage.data[CHECKOUT_STORAGE_KEY] = JSON.stringify(stored);

    renderWithStore(<App />, createApi(), storage);
    const restored = await screen.findByRole('dialog', { name: /checkout/i });
    await fillCard(user, restored);
    await waitFor(() =>
      expect(within(restored).getByRole('checkbox')).toBeEnabled(),
    );
    await user.click(within(restored).getByRole('checkbox'));
    await user.click(
      within(restored).getByRole('button', { name: 'Continue' }),
    );

    expect(await within(restored).findByLabelText('Email')).toHaveFocus();
    expect(
      within(restored).getByText('Enter a valid email address'),
    ).toBeInTheDocument();
  });

  it('closes right away when nothing was entered', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(store.getState().checkout.step).toBe(1);
    expect(
      await screen.findByRole('heading', { name: 'Desk Lamp' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /checkout/i })).toBeNull();
  });

  it('asks for confirmation before discarding what was entered', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<App />, createApi());
    const dialog = await openCheckout(user);
    await user.type(within(dialog).getByLabelText('Full name'), 'Jane Doe');

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent('Discard checkout?');
    await user.click(
      within(confirm).getByRole('button', { name: 'Keep editing' }),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(store.getState().checkout.step).toBe(2);

    const notPrevented = fireEvent(
      screen.getByRole('dialog', { name: /checkout/i }),
      new Event('cancel', { cancelable: true }),
    );
    expect(notPrevented).toBe(false);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Discard',
      }),
    );

    expect(store.getState().checkout.step).toBe(1);
    expect(
      await screen.findByRole('heading', { name: 'Desk Lamp' }),
    ).toBeInTheDocument();
  });

  it('lets the user retry when the terms cannot be loaded', async () => {
    const user = userEvent.setup();
    const get = createApi({ tokens: 'fail' });
    renderWithStore(<App />, get);
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not load the terms',
    );
    expect(within(dialog).getByRole('checkbox')).toBeDisabled();

    get.mockImplementation((url: string) =>
      url === '/api/products'
        ? Promise.resolve({ data: products })
        : Promise.resolve({ data: tokens }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(within(dialog).getByRole('checkbox')).toBeEnabled(),
    );
  });

  it('drops a stored checkout whose product no longer exists', async () => {
    const storage = memoryStorage({
      [CHECKOUT_STORAGE_KEY]: JSON.stringify({
        step: 2,
        productId: 'gone',
        traceId: 'trace-1',
        quantity: 1,
      }),
    });
    const { store } = renderWithStore(<App />, createApi(), storage);

    await waitFor(() => expect(store.getState().checkout.step).toBe(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('payment from the summary', () => {
  async function openSummary(options: {
    post: jest.Mock;
    api?: jest.Mock;
    storage?: ReturnType<typeof memoryStorage>;
  }) {
    const user = userEvent.setup();
    const get = options.api ?? createApi();
    const rendered = renderWithStore(
      <App />,
      get,
      options.storage ?? memoryStorage(),
      options.post,
    );
    const dialog = await openCheckout(user);
    await goToSummary(user, dialog);
    return { user, dialog, get, ...rendered };
  }

  it('creates the transaction, pays with the card and clears it from memory', async () => {
    const post = createPost('APPROVED');
    const storage = memoryStorage();
    const { user, dialog, store } = await openSummary({ post, storage });

    await user.click(within(dialog).getByRole('button', { name: /^Pay \$/ }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Payment approved',
    );
    const { traceId, reference } = store.getState().checkout;
    const headers = { 'X-Trace-Id': traceId };
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/api/transactions',
      {
        productId: 'p-1',
        quantity: 1,
        installments: 1,
        reference,
        customer: {
          documentType: 'CC',
          documentNumber: '1020304050',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '3001112233',
        },
      },
      { headers },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/api/transactions/tx-1/pay',
      {
        card: {
          number: '4242424242424242',
          cvc: '123',
          expMonth: '12',
          expYear: '99',
          holder: 'JANE DOE',
        },
        shipping: {
          address: 'Calle 1 # 2-3',
          city: 'Bogota',
          region: 'Cundinamarca',
          postalCode: '110111',
        },
        acceptanceToken: tokens.acceptanceToken,
        personalAuthToken: tokens.personalAuthToken,
      },
      { headers, timeout: 35000 },
    );
    expect(store.getState().checkout.transactionId).toBe('tx-1');

    const persisted = storage.data[CHECKOUT_STORAGE_KEY];
    expect(persisted).not.toContain('4242424242424242');
    expect(persisted).not.toContain(tokens.acceptanceToken);

    await user.click(
      within(dialog).getByRole('button', { name: 'Edit card info' }),
    );
    expect(within(dialog).getByLabelText('Card number')).toHaveValue('');
  });

  it('disables "Pay" while processing so it cannot be sent twice', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const post = jest.fn((url: string) =>
      url === '/api/transactions'
        ? Promise.resolve({ data: transaction('PENDING') })
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    const { user, dialog } = await openSummary({ post });

    await user.dblClick(
      within(dialog).getByRole('button', { name: /^Pay \$/ }),
    );

    const processing = await within(dialog).findByRole('button', {
      name: 'Processing...',
    });
    expect(processing).toBeDisabled();
    expect(post).toHaveBeenCalledTimes(2);

    finish({ data: transaction('APPROVED') });
    expect(await within(dialog).findByRole('status')).toBeInTheDocument();
  });

  it.each(['DECLINED', 'ERROR', 'VOIDED'])(
    'goes back to the card step with a new reference after a %s payment',
    async (outcome) => {
      const post = createPost(outcome);
      const { user, dialog, store, get } = await openSummary({ post });
      const before = store.getState().checkout.reference;

      await user.click(within(dialog).getByRole('button', { name: /^Pay \$/ }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Enter your card again',
      );
      const state = store.getState().checkout;
      expect(state.formSection).toBe(3);
      expect(state.transactionId).toBeNull();
      expect(state.reference).not.toBe(before);
      expect(within(dialog).getByLabelText('Card number')).toHaveValue('');
      expect(
        within(dialog).queryByText('This field is required'),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByText(
          'For your security, your card details were cleared.',
        ),
      ).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Card number')).toHaveFocus();
      await waitFor(() =>
        expect(
          get.mock.calls.filter(
            ([url]) => url === '/api/payments/acceptance-tokens',
          ),
        ).toHaveLength(2),
      );
    },
  );

  it.each([
    [
      'a network failure',
      new AxiosError('Network Error', 'ERR_NETWORK'),
      3,
      'could not confirm',
    ],
    [
      'a gateway failure',
      httpError(502, { code: 'GATEWAY_ERROR' }),
      3,
      'unavailable',
    ],
    [
      'a card the gateway rejected',
      httpError(422, { code: 'CARD_REJECTED' }),
      3,
      'could not accept this card',
    ],
    ['too many attempts', httpError(429), 3, 'Too many attempts'],
    [
      'an order already processed',
      httpError(409, { code: 'INVALID_TRANSACTION_STATE' }),
      4,
      'already processed',
    ],
  ])('explains %s', async (_name, failure, section, message) => {
    const post = createPost(failure);
    const { user, dialog, store } = await openSummary({ post });

    await user.click(within(dialog).getByRole('button', { name: /^Pay \$/ }));

    expect(
      await within(dialog).findByText(new RegExp(message)),
    ).toBeInTheDocument();
    expect(store.getState().checkout.formSection).toBe(section);
    expect(store.getState().checkout.transactionId).toBe('tx-1');
  });

  it('offers to go back to the product when the stock ran out, refreshing the catalog', async () => {
    const post = createPost(httpError(409, { code: 'OUT_OF_STOCK' }));
    const { user, dialog, store, get } = await openSummary({ post });

    await user.click(within(dialog).getByRole('button', { name: /^Pay \$/ }));
    await user.click(
      await within(dialog).findByRole('button', { name: 'Back to product' }),
    );

    expect(store.getState().checkout.step).toBe(1);
    await waitFor(() =>
      expect(
        get.mock.calls.filter(([url]) => url === '/api/products'),
      ).toHaveLength(2),
    );
  });

  it.each([
    [
      'a product that ran out of stock',
      httpError(409, { code: 'OUT_OF_STOCK' }),
      'Back to product',
    ],
    [
      'a network failure',
      new AxiosError('Network Error', 'ERR_NETWORK'),
      'Retry',
    ],
  ])(
    'handles a quote request that fails with %s',
    async (_name, failure, action) => {
      const user = userEvent.setup();
      renderWithStore(<App />, createApi({ quote: failure }), memoryStorage());
      const dialog = await openCheckout(user);

      await goToCardStep(user, dialog);
      await fillCard(user, dialog);
      await waitFor(() =>
        expect(within(dialog).getByRole('checkbox')).toBeEnabled(),
      );
      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(
        within(dialog).getByRole('button', { name: 'Continue' }),
      );

      expect(
        await within(dialog).findByRole('button', { name: action }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('button', { name: 'Pay' }),
      ).toBeDisabled();
    },
  );

  it('asks to re-enter the card after a reload on the summary', async () => {
    const storage = memoryStorage({
      [CHECKOUT_STORAGE_KEY]: JSON.stringify({
        step: 2,
        formSection: 4,
        productId: 'p-1',
        quantity: 1,
        traceId: 'trace-1',
        reference: 'ref-1',
        cardLast4: '4242',
        cardBrand: 'VISA',
        customer: {
          documentType: 'CC',
          documentNumber: '1020304050',
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          phone: '3001112233',
        },
        shipping: {
          address: 'Calle 1 # 2-3',
          city: 'Bogota',
          region: 'Cundinamarca',
          postalCode: '110111',
        },
      }),
    });
    const user = userEvent.setup();
    renderWithStore(<App />, createApi(), storage, createPost());

    const dialog = await screen.findByRole('dialog', { name: /checkout/i });

    expect(
      await within(dialog).findByText('Re-enter your card to pay.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /^Pay \$/ }),
    ).toBeDisabled();

    await user.click(
      within(dialog).getByRole('button', { name: 'Enter card' }),
    );
    expect(within(dialog).getByLabelText('Card number')).toBeInTheDocument();
  });
});
