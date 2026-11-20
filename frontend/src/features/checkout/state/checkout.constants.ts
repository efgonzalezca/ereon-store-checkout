export const DOCUMENT_TYPES = [
  'CC',
  'CE',
  'NIT',
  'PP',
  'TI',
  'DNI',
  'RG',
  'OTHER',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const INSTALLMENTS_MIN = 1;
export const INSTALLMENTS_MAX = 36;
