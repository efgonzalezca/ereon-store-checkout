import { formatCents } from './currency';

describe('formatCents', () => {
  it('formats cents as Colombian pesos', () => {
    expect(formatCents(38990000)).toMatch(/^\$\s?389\.900$/);
  });
});
