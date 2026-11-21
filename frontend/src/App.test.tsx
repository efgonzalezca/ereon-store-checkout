import { screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { App } from './App';
import { renderWithStore } from './test/render-with-store';

describe('App shell', () => {
  it('renders the store header and main landmarks', async () => {
    renderWithStore(<App />, jest.fn().mockResolvedValue({ data: [] }));

    expect(
      screen.getByRole('heading', { name: 'Ereon Store' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Products' }),
    ).toBeInTheDocument();
  });

  it('keeps the mobile-first layout contract that prevents horizontal overflow', () => {
    const root = join(__dirname, '..');
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const css = readFileSync(join(__dirname, 'index.css'), 'utf8');

    expect(html).toContain('width=device-width, initial-scale=1.0');
    expect(css).toMatch(/box-sizing:\s*border-box/);
    expect(css).toMatch(/img,[\s\S]*max-width:\s*100%/);
    expect(css).not.toMatch(/overflow-x:\s*hidden/);
  });
});
