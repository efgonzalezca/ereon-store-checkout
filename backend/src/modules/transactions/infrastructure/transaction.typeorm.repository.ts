import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { DuplicateReferenceError } from '../../../shared/rop/errors';
import { err, ok, Result } from '../../../shared/rop/result';
import { NewTransaction, Transaction } from '../domain/transaction';
import { ITransactionRepository } from '../domain/transaction.repository.port';
import { TransactionOrmEntity } from './transaction.orm-entity';

const UNIQUE_VIOLATION = '23505';

const toDomain = (row: TransactionOrmEntity): Transaction => ({
  id: row.id,
  reference: row.reference,
  status: row.status,
  productId: row.productId,
  customerId: row.customerId,
  quantity: row.quantity,
  installments: row.installments,
  productAmountCents: row.productAmountCents,
  baseFeeCents: row.baseFeeCents,
  deliveryFeeCents: row.deliveryFeeCents,
  totalAmountCents: row.totalAmountCents,
  ipAddress: row.ipAddress,
});

@Injectable()
export class TransactionTypeOrmRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly repository: Repository<TransactionOrmEntity>,
  ) {}

  async findByReference(reference: string): Promise<Transaction | null> {
    const row = await this.repository.findOneBy({ reference });
    return row ? toDomain(row) : null;
  }

  async create(
    data: NewTransaction,
  ): Promise<Result<Transaction, DuplicateReferenceError>> {
    try {
      const row = await this.repository.save(this.repository.create(data));
      return ok(toDomain(row));
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
