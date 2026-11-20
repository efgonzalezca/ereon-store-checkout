import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import { Transaction } from '../../domain/transaction';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../domain/transaction.repository.port';

@Injectable()
export class GetTransactionByIdUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: ITransactionRepository,
  ) {}

  async execute(id: string): Promise<Result<Transaction, NotFoundError>> {
    const transaction = await this.transactions.findById(id);
    return transaction
      ? ok(transaction)
      : err(new NotFoundError('Transaction not found'));
  }
}
