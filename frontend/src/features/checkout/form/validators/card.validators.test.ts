import {
  detectCardBrand,
  validateCardHolder,
  validateCardNumber,
  validateCvc,
  validateExpiry,
  validateInstallments,
} from './card.validators';

describe('card number', () => {
  it.each([
    ['4242 4242 4242 4242', null],
    ['4242-4242-4242-4242', null],
    ['5555555555554444', null],
    ['2223003122003222', null],
    ['', 'required'],
    ['4242 4242 4242 4241', 'invalid_luhn'],
    ['4242abcd', 'invalid_format'],
    ['4242 4242 4242 42a2', 'invalid_format'],
    ['424242424242', 'invalid_format'],
    ['378282246310005', 'unsupported_brand'],
  ])('validates %p -> %p', (value, expected) => {
    expect(validateCardNumber(value)).toBe(expected);
  });

  it.each([
    ['4111111111111111', 'VISA'],
    ['5105 1051 0510 5100', 'MASTERCARD'],
    ['2720999999999999', 'MASTERCARD'],
    ['2721000000000000', null],
    ['6011111111111117', null],
    ['', null],
  ])('detects the brand of %p -> %p', (value, brand) => {
    expect(detectCardBrand(value)).toBe(brand);
  });
});

describe('expiry', () => {
  const now = new Date(2026, 10, 19);

  it.each([
    ['11/26', null],
    ['12/26', null],
    ['01/30', null],
    ['10/26', 'expired'],
    ['12/25', 'expired'],
    ['', 'required'],
    ['13/27', 'invalid_format'],
    ['1/27', 'invalid_format'],
    ['2027-01', 'invalid_format'],
  ])('validates %p -> %p', (value, expected) => {
    expect(validateExpiry(value, now)).toBe(expected);
  });

  it('uses the current date by default', () => {
    expect(validateExpiry('01/20')).toBe('expired');
  });
});

describe('cvc, installments and holder', () => {
  it.each([
    ['123', null],
    ['', 'required'],
    ['12', 'invalid_cvc'],
    ['1234', 'invalid_cvc'],
    ['12a', 'invalid_cvc'],
  ])('validates cvc %p -> %p', (value, expected) => {
    expect(validateCvc(value)).toBe(expected);
  });

  it.each([
    [1, null],
    [36, null],
    [0, 'invalid_installments'],
    [37, 'invalid_installments'],
    [2.5, 'invalid_installments'],
    [Number.NaN, 'invalid_installments'],
  ])('validates installments %p -> %p', (value, expected) => {
    expect(validateInstallments(value)).toBe(expected);
  });

  it('requires a non-blank card holder', () => {
    expect(validateCardHolder('Jane Doe')).toBeNull();
    expect(validateCardHolder('   ')).toBe('required');
  });
});
