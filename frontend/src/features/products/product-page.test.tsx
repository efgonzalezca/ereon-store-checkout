import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { products, renderWithStore } from '@/test/render-with-store';
import { ProductPage } from './product-page';

const renderPage = () =>
  renderWithStore(
    <ProductPage />,
    jest.fn().mockResolvedValue({ data: products }),
  );

describe('ProductPage', () => {
  it('lists the catalog with formatted price and stock', async () => {
    renderPage();

    const lamp = await screen.findByRole('button', { name: /Desk Lamp/ });

    expect(lamp).toHaveTextContent(/89\.900/);
    expect(lamp).toHaveTextContent('3 in stock');
    expect(
      screen.getByRole('button', { name: /Limited Edition Backpack/ }),
    ).toHaveTextContent('Out of stock');
  });

  it('opens a product in a modal and picks a quantity from a list bounded by stock', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Desk Lamp/ }));

    expect(
      screen.getByRole('dialog', { name: 'Desk Lamp' }),
    ).toBeInTheDocument();
    expect(screen.getByText('LED desk lamp')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pay with credit card' }),
    ).toBeEnabled();

    const trigger = screen.getByRole('button', { name: /Quantity/ });
    expect(trigger).toHaveTextContent('1');
    await user.click(trigger);
    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toEqual(['1', '2', '3']);

    await user.click(screen.getByRole('option', { name: '3' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quantity/ })).toHaveTextContent(
      '3',
    );
  });

  it('supports the keyboard and closes the list without closing the modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Desk Lamp/ }));
    const trigger = screen.getByRole('button', { name: /Quantity/ });

    await user.click(trigger);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');
    expect(screen.getByRole('button', { name: /Quantity/ })).toHaveTextContent(
      '2',
    );

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole('heading', { name: 'Desk Lamp' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal with the close button or Escape, but not by clicking outside it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Desk Lamp/ }));
    await user.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /Desk Lamp/ }));
    (screen.getByRole('dialog') as HTMLDialogElement).close();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('disables the pay button and the quantity when the product has no stock', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: /Limited Edition Backpack/ }),
    );

    expect(
      screen.getByRole('button', { name: 'Pay with credit card' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /Quantity/ })).toBeDisabled();
  });

  it('shows an error with a retry that loads the catalog', async () => {
    const user = userEvent.setup();
    const get = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: products });
    renderWithStore(<ProductPage />, get);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('button', { name: /Desk Lamp/ }),
    ).toBeInTheDocument();
  });
});
