import axios from 'axios';
import {
  ApiErrorKind,
  SubmissionState,
  TransactionStatus,
} from './payment.types';

export const RETRYABLE_ERRORS: readonly ApiErrorKind[] = [
  'card_rejected',
  'network',
  'gateway',
  'rate_limited',
  'unexpected',
];

export const FAILED_STATUSES: readonly TransactionStatus[] = [
  'DECLINED',
  'ERROR',
  'VOIDED',
];

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  not_found: 'We could not find this product anymore.',
  out_of_stock: 'There is not enough stock for this product.',
  not_payable:
    'This order was already processed and can no longer be paid again.',
  rate_limited:
    'Too many attempts. Wait a minute, then enter your card again and retry.',
  gateway:
    'The payment service is unavailable right now. Wait a moment, then enter your card again and retry.',
  card_rejected:
    'We could not accept this card. Check the number, expiry and CVC, or use another card, and enter it again.',
  network:
    'We could not confirm your payment. Wait a minute before retrying so you are not charged twice, then enter your card again.',
  unexpected: 'Something went wrong. Enter your card again and retry.',
};

const STATUS_MESSAGES: Partial<Record<TransactionStatus, string>> = {
  DECLINED:
    'Your bank declined the payment and you were not charged. Enter your card again or use another card.',
  ERROR: 'The payment could not be completed. Enter your card again to retry.',
  VOIDED: 'The payment was voided. Enter your card again to retry.',
};

export const errorMessage = (kind: ApiErrorKind): string =>
  ERROR_MESSAGES[kind];

export function classifyError(error: unknown): ApiErrorKind {
  if (!axios.isAxiosError<{ code?: string }>(error)) return 'unexpected';
  if (!error.response) return 'network';

  const { status, data } = error.response;
  if (status === 404) return 'not_found';
  if (status === 409) {
    return data?.code === 'OUT_OF_STOCK' ? 'out_of_stock' : 'not_payable';
  }
  if (status === 422 && data?.code === 'CARD_REJECTED') return 'card_rejected';
  if (status === 429) return 'rate_limited';
  if (status === 502) return 'gateway';
  return 'unexpected';
}

export function submissionMessage(submission: SubmissionState): string | null {
  if (submission.status === 'failed' && submission.error) {
    return ERROR_MESSAGES[submission.error];
  }
  if (submission.status === 'done' && submission.result) {
    return STATUS_MESSAGES[submission.result.status] ?? null;
  }
  return null;
}
