import { DocumentType } from './document-type';

export interface CustomerData {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
}

export interface Customer extends CustomerData {
  readonly id: string;
}
