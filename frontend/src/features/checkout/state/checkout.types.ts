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

/** 1 = no checkout in progress, 2 = checkout modal open. */
export type CheckoutStep = 1 | 2;

/** Data steps of the modal: 1 personal info, 2 shipping, 3 card. */
export type DataSection = 1 | 2 | 3;

/** Modal steps: the data steps plus 4, the summary. */
export type CheckoutSection = DataSection | 4;

export interface CheckoutState {
  step: CheckoutStep;
  formSection: CheckoutSection;
  productId: string | null;
  quantity: number;
  traceId: string | null;
  customer: CustomerForm;
  shipping: ShippingForm;
  installments: number;
  cardLast4: string | null;
  cardBrand: CardBrand | null;
}
