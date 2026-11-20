import { DuplicateReferenceError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { NewTransaction, Transaction } from './transaction';

export interface ITransactionRepository {
  findByReference(reference: string): Promise<Transaction | null>;
  /** Persists a `PENDING` transaction; fails if the reference is already taken. */
  create(
    data: NewTransaction,
  ): Promise<Result<Transaction, DuplicateReferenceError>>;
}

export const TRANSACTION_REPOSITORY = Symbol('ITransactionRepository');
