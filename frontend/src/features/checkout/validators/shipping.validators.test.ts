import {
  validateDocumentType,
  validatePostalCode,
  validateRequired,
} from './shipping.validators';

describe('shipping validators', () => {
  it('requires non-blank text', () => {
    expect(validateRequired('Calle 1 # 2-3')).toBeNull();
    expect(validateRequired('  ')).toBe('required');
  });

  it.each([
    ['CC', null],
    ['OTHER', null],
    ['cc', 'invalid_document_type'],
    ['XX', 'invalid_document_type'],
    ['', 'invalid_document_type'],
  ])('validates document type %p -> %p', (value, expected) => {
    expect(validateDocumentType(value)).toBe(expected);
  });

  it.each([
    ['110111', null],
    ['SW1A-1AA', null],
    ['', 'required'],
    ['12', 'invalid_postal_code'],
    ['12345678901', 'invalid_postal_code'],
    ['11 011', 'invalid_postal_code'],
  ])('validates postal code %p -> %p', (value, expected) => {
    expect(validatePostalCode(value)).toBe(expected);
  });
});
