import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

function createApi(tokensResult: 'ok' | 'fail' = 'ok') {
  return jest.fn((url: string) => {
    if (url === '/api/products') return Promise.resolve({ data: products });
    return tokensResult === 'ok'
      ? Promise.resolve({ data: tokens })
      : Promise.reject(new Error('gateway down'));
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

  it('opens the read-only summary and never persists the card or the tokens', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const { store } = renderWithStore(<App />, createApi(), storage);
    const dialog = await openCheckout(user);
    await goToCardStep(user, dialog);
    await fillCard(user, dialog);
    await waitFor(() =>
      expect(within(dialog).getByRole('checkbox')).toBeEnabled(),
    );
    await user.click(within(dialog).getByRole('checkbox'));

    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));

    expect(store.getState().checkout).toMatchObject({
      step: 2,
      formSection: 4,
      cardLast4: '4242',
      cardBrand: 'VISA',
    });
    expect(within(dialog).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(dialog).getByText('•••• 4242')).toBeInTheDocument();
    expect(within(dialog).getByText('Calle 1 # 2-3')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: /pay/i }),
    ).not.toBeInTheDocument();

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

    await user.click(
      within(dialog).getByRole('button', { name: 'Edit shipping info' }),
    );
    expect(within(dialog).getByLabelText('City')).toHaveValue('Bogota');
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
    const get = createApi('fail');
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
