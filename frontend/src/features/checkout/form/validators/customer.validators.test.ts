import { validateEmail, validatePhone } from './customer.validators';

describe('customer validators', () => {
  it.each([
    ['jane@example.com', null],
    ['', 'required'],
    ['jane@example', 'invalid_email'],
    ['jane example@x.com', 'invalid_email'],
  ])('validates email %p -> %p', (value, expected) => {
    expect(validateEmail(value)).toBe(expected);
  });

  it.each([
    ['3001112233', null],
    ['+57 300 111 2233', null],
    ['(601) 555-1234', null],
    ['', 'required'],
    ['12345', 'invalid_phone'],
    ['300abc2233', 'invalid_phone'],
  ])('validates phone %p -> %p', (value, expected) => {
    expect(validatePhone(value)).toBe(expected);
  });
});
