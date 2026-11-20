import { DOCUMENT_TYPES } from '../../state/checkout.constants';

export type RequiredFieldError = 'required';
export type DocumentTypeError = 'invalid_document_type';
export type PostalCodeError = 'required' | 'invalid_postal_code';

export const validateRequired = (value: string): RequiredFieldError | null =>
  value.trim() === '' ? 'required' : null;

export function validateDocumentType(value: string): DocumentTypeError | null {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
    ? null
    : 'invalid_document_type';
}

export function validatePostalCode(value: string): PostalCodeError | null {
  const code = value.trim();
  if (code === '') return 'required';
  return /^[A-Za-z0-9-]{3,10}$/.test(code) ? null : 'invalid_postal_code';
}
