import { DataSection } from '../state/checkout.types';
import {
  validateCardHolder,
  validateCardNumber,
  validateCvc,
  validateExpiry,
  validateInstallments,
} from './validators/card.validators';
import { validateEmail, validatePhone } from './validators/customer.validators';
import {
  validateDocumentType,
  validatePostalCode,
  validateRequired,
} from './validators/shipping.validators';

export const FIELD_NAMES = [
  'documentType',
  'documentNumber',
  'fullName',
  'email',
  'phone',
  'address',
  'city',
  'region',
  'postalCode',
  'cardNumber',
  'cardHolder',
  'expiry',
  'cvc',
  'installments',
] as const;

export const SECTION_FIELDS: Record<DataSection, readonly FieldName[]> = {
  1: ['documentType', 'documentNumber', 'fullName', 'email', 'phone'],
  2: ['address', 'city', 'region', 'postalCode'],
  3: ['cardNumber', 'cardHolder', 'expiry', 'cvc', 'installments'],
};

export type FieldName = (typeof FIELD_NAMES)[number];
export const sectionOf = (field: FieldName): DataSection =>
  ([1, 2, 3] as const).find((section) =>
    SECTION_FIELDS[section].includes(field),
  ) as DataSection;

export type FieldValues = Record<FieldName, string>;
export type FieldErrors = Record<FieldName, string | null>;

export function validateCheckout(values: FieldValues): FieldErrors {
  return {
    documentType: validateDocumentType(values.documentType),
    documentNumber: validateRequired(values.documentNumber),
    fullName: validateRequired(values.fullName),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    address: validateRequired(values.address),
    city: validateRequired(values.city),
    region: validateRequired(values.region),
    postalCode: validatePostalCode(values.postalCode),
    cardNumber: validateCardNumber(values.cardNumber),
    cardHolder: validateCardHolder(values.cardHolder),
    expiry: validateExpiry(values.expiry),
    cvc: validateCvc(values.cvc),
    installments: validateInstallments(Number(values.installments)),
  };
}

const FIELD_MESSAGES: Partial<Record<FieldName, Record<string, string>>> = {
  cardNumber: {
    invalid_format: 'Enter 13 to 19 digits',
    invalid_luhn: 'The card number is not valid',
    unsupported_brand: 'Only Visa and Mastercard are accepted',
  },
  expiry: {
    invalid_format: 'Use the MM/YY format',
    expired: 'The card has expired',
  },
  cvc: { invalid_cvc: 'Enter the 3 digits on the back of the card' },
  email: { invalid_email: 'Enter a valid email address' },
  phone: { invalid_phone: 'Enter a valid phone number (7 to 15 digits)' },
  postalCode: { invalid_postal_code: 'Use 3 to 10 letters, digits or hyphens' },
  documentType: { invalid_document_type: 'Select a document type' },
  installments: {
    invalid_installments: 'Choose between 1 and 36 installments',
  },
};

export function errorMessage(field: FieldName, code: string): string {
  return FIELD_MESSAGES[field]?.[code] ?? 'This field is required';
}
