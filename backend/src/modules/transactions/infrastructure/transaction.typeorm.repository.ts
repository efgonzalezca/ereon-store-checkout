import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { DuplicateReferenceError } from '../../../shared/rop/errors';
import { err, ok, Result } from '../../../shared/rop/result';
import {
  NewTransaction,
  Transaction,
  TransactionStatus,
} from '../domain/transaction';
import { ITransactionRepository } from '../domain/transaction.repository.port';
import { toTransaction } from './transaction.mapper';
import { TransactionOrmEntity } from './transaction.orm-entity';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class TransactionTypeOrmRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repository: Repository<TransactionOrmEntity>,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? toTransaction(row) : null;
  }

  async saveOutcome(
    id: string,
    outcome: { status: TransactionStatus; externalId: string },
  ): Promise<Transaction> {
    await this.repository.update({ id }, outcome);
    return toTransaction(await this.repository.findOneByOrFail({ id }));
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    const row = await this.repository.findOneBy({ reference });
    return row ? toTransaction(row) : null;
  }

  async create(
    data: NewTransaction,
  ): Promise<Result<Transaction, DuplicateReferenceError>> {
    try {
      const row = await this.repository.save(this.repository.create(data));
      return ok(toTransaction(row));
    } catch (error) {
      const code = (error as { driverError?: { code?: string } }).driverError
        ?.code;
      if (error instanceof QueryFailedError && code === UNIQUE_VIOLATION) {
        return err(new DuplicateReferenceError('Reference is already in use'));
      }
      throw error;
    }
  }
}
