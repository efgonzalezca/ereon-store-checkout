export type TransactionStatus =
  'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';

export interface Amounts {
  productAmountCents: number;
  baseFeeCents: number;
  deliveryFeeCents: number;
  totalAmountCents: number;
}

export interface TransactionResult extends Amounts {
  id: string;
  reference: string;
  status: TransactionStatus;
  quantity: number;
  installments: number;
}

export type ApiErrorKind =
  | 'not_found'
  | 'out_of_stock'
  | 'not_payable'
  | 'rate_limited'
  | 'gateway'
  | 'card_rejected'
  | 'network'
  | 'unexpected';

export interface CardPayload {
  number: string;
  cvc: string;
  expMonth: string;
  expYear: string;
  holder: string;
}

export interface SubmitPaymentArgs {
  card: CardPayload;
  acceptanceToken: string;
  personalAuthToken: string;
}

type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface QuoteState {
  status: RequestStatus;
  amounts: Amounts | null;
  error: ApiErrorKind | null;
}

export interface SubmissionState {
  status: 'idle' | 'submitting' | 'checking' | 'done' | 'failed';
  result: TransactionResult | null;
  error: ApiErrorKind | null;
}

export type PaymentOutcome = TransactionStatus | 'REJECTED' | 'UNCONFIRMED';

export interface PaymentState {
  quote: QuoteState;
  submission: SubmissionState;
}
