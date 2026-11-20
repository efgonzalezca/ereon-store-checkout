import { CardBrand } from '../form/validators/card.validators';
import { DocumentType } from './checkout.constants';

export interface AcceptanceTokens {
  acceptanceToken: string;
  acceptancePermalink: string;
  personalAuthToken: string;
  personalAuthPermalink: string;
}

export interface CustomerForm {
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface ShippingForm {
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

export type CheckoutStep = 1 | 2;

export type DataSection = 1 | 2 | 3;

export type CheckoutSection = DataSection | 4;

export interface CheckoutState {
  step: CheckoutStep;
  formSection: CheckoutSection;
  productId: string | null;
  quantity: number;
  traceId: string | null;
  reference: string | null;
  transactionId: string | null;
  paymentAttempted: boolean;
  customer: CustomerForm;
  shipping: ShippingForm;
  installments: number;
  cardLast4: string | null;
  cardBrand: CardBrand | null;
}
