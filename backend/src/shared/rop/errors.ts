import { DomainError } from './domain-error';

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

export class OutOfStockError extends DomainError {
  readonly code = 'OUT_OF_STOCK';
}

export class InvalidTransactionStateError extends DomainError {
  readonly code = 'INVALID_TRANSACTION_STATE';
}

export class PaymentDeclinedError extends DomainError {
  readonly code = 'PAYMENT_DECLINED';
}

export class VoidedTransactionError extends DomainError {
  readonly code = 'TRANSACTION_VOIDED';
}

export class GatewayError extends DomainError {
  readonly code = 'GATEWAY_ERROR';
}

export class DuplicateReferenceError extends DomainError {
  readonly code = 'DUPLICATE_REFERENCE';
}
