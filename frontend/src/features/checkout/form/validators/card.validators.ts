import {
  INSTALLMENTS_MAX,
  INSTALLMENTS_MIN,
} from '../../state/checkout.constants';

export type CardBrand = 'VISA' | 'MASTERCARD';

export type CardNumberError =
  'required' | 'invalid_format' | 'invalid_luhn' | 'unsupported_brand';
export type ExpiryError = 'required' | 'invalid_format' | 'expired';
export type CvcError = 'required' | 'invalid_cvc';
export type InstallmentsError = 'invalid_installments';
export type CardHolderError = 'required';

const PAN_MIN_LENGTH = 13;
const PAN_MAX_LENGTH = 19;

const stripSeparators = (value: string): string => value.replace(/[\s-]/g, '');

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(value: string): CardBrand | null {
  const pan = stripSeparators(value);
  if (/^4/.test(pan)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d{2}|7[01]\d|720))/.test(pan)) {
    return 'MASTERCARD';
  }
  return null;
}

export function validateCardNumber(value: string): CardNumberError | null {
  const pan = stripSeparators(value);
  if (pan === '') return 'required';
  if (
    !/^\d+$/.test(pan) ||
    pan.length < PAN_MIN_LENGTH ||
    pan.length > PAN_MAX_LENGTH
  ) {
    return 'invalid_format';
  }
  if (!passesLuhn(pan)) return 'invalid_luhn';
  return detectCardBrand(pan) === null ? 'unsupported_brand' : null;
}

export function validateExpiry(
  value: string,
  now: Date = new Date(),
): ExpiryError | null {
  const text = value.trim();
  if (text === '') return 'required';

  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(text);
  if (!match) return 'invalid_format';

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const currentYear = now.getFullYear();
  const isPast =
    year < currentYear || (year === currentYear && month < now.getMonth() + 1);
  return isPast ? 'expired' : null;
}

export function validateCvc(value: string): CvcError | null {
  if (value === '') return 'required';
  return /^\d{3}$/.test(value) ? null : 'invalid_cvc';
}

export function validateInstallments(value: number): InstallmentsError | null {
  const isValid =
    Number.isInteger(value) &&
    value >= INSTALLMENTS_MIN &&
    value <= INSTALLMENTS_MAX;
  return isValid ? null : 'invalid_installments';
}

export function validateCardHolder(value: string): CardHolderError | null {
  return value.trim() === '' ? 'required' : null;
}
