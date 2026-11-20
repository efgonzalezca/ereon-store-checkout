import { Inject, Injectable } from '@nestjs/common';
import { CustomerData } from '../../../customers/domain/customer';
import { FindOrCreateCustomerUseCase } from '../../../customers/application/use-cases/find-or-create-customer.use-case';
import {
  DuplicateReferenceError,
  NotFoundError,
  OutOfStockError,
} from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import { Transaction } from '../../domain/transaction';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../domain/transaction.repository.port';
import { GetQuoteUseCase } from './get-quote.use-case';

export interface CreateTransactionInput {
  readonly reference: string;
  readonly productId: string;
  readonly quantity: number;
  readonly installments: number;
  readonly customer: CustomerData;
  readonly ipAddress: string | null;
}

type CreateTransactionError =
  NotFoundError | OutOfStockError | DuplicateReferenceError;

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: ITransactionRepository,
    private readonly getQuote: GetQuoteUseCase,
    private readonly findOrCreateCustomer: FindOrCreateCustomerUseCase,
  ) {}

  async execute(
    input: CreateTransactionInput,
  ): Promise<Result<Transaction, CreateTransactionError>> {
    const existing = await this.transactions.findByReference(input.reference);
    if (existing) return this.replay(existing, input);

    const quote = await this.getQuote.execute(input.productId, input.quantity);
    if (!quote.isOk) return quote;

    const customer = await this.findOrCreateCustomer.execute(input.customer);
    if (!customer.isOk) return customer;

    const created = await this.transactions.create({
      reference: input.reference,
      productId: input.productId,
      customerId: customer.value.id,
      quantity: input.quantity,
      installments: input.installments,
      ipAddress: input.ipAddress,
      ...quote.value,
    });
    if (created.isOk) return created;

    // Lost a race against the same reference: treat it as a replay.
    const winner = await this.transactions.findByReference(input.reference);
    return winner ? this.replay(winner, input) : created;
  }

  /**
   * A retry of the same request (for example after a lost response) returns
   * the transaction that already exists; any other use of the reference fails.
   */
  private async replay(
    existing: Transaction,
    input: CreateTransactionInput,
  ): Promise<Result<Transaction, DuplicateReferenceError>> {
    const customer = await this.findOrCreateCustomer.execute(input.customer);
    const isSameRequest =
      customer.isOk &&
      existing.productId === input.productId &&
      existing.customerId === customer.value.id &&
      existing.quantity === input.quantity &&
      existing.installments === input.installments;

    return isSameRequest
      ? ok(existing)
      : err(new DuplicateReferenceError('Reference is already in use'));
  }
}
