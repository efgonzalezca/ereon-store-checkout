export const TRANSACTION_STATUSES = [
  'PENDING',
  'APPROVED',
  'DECLINED',
  'ERROR',
  'VOIDED',
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const MAX_INSTALLMENTS = 36;

export interface Amounts {
  readonly productAmountCents: number;
  readonly baseFeeCents: number;
  readonly deliveryFeeCents: number;
  readonly totalAmountCents: number;
}

export interface NewTransaction extends Amounts {
  readonly reference: string;
  readonly productId: string;
  readonly customerId: string;
  readonly quantity: number;
  readonly installments: number;
  readonly ipAddress: string | null;
}

export interface Transaction extends NewTransaction {
  readonly id: string;
  readonly status: TransactionStatus;
}
