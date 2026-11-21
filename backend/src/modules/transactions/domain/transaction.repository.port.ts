import { DuplicateReferenceError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { NewTransaction, Transaction, TransactionStatus } from './transaction';

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByReference(reference: string): Promise<Transaction | null>;
  saveOutcome(
    id: string,
    outcome: { status: TransactionStatus; externalId: string },
  ): Promise<Transaction>;
  create(
    data: NewTransaction,
  ): Promise<Result<Transaction, DuplicateReferenceError>>;
}

export const TRANSACTION_REPOSITORY = Symbol('ITransactionRepository');
