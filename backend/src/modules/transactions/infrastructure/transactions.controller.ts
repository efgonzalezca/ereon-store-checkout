import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import { Transaction } from '../domain/transaction';
import {
  DuplicateReferenceError,
  NotFoundError,
  OutOfStockError,
} from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { resolveClientIp } from './client-ip';
import { CreateTransactionDto } from './dto/create-transaction.dto';

export interface TransactionResponse {
  id: string;
  reference: string;
  status: Transaction['status'];
  quantity: number;
  installments: number;
  productAmountCents: number;
  baseFeeCents: number;
  deliveryFeeCents: number;
  totalAmountCents: number;
}

const toResponse = (transaction: Transaction): TransactionResponse => ({
  id: transaction.id,
  reference: transaction.reference,
  status: transaction.status,
  quantity: transaction.quantity,
  installments: transaction.installments,
  productAmountCents: transaction.productAmountCents,
  baseFeeCents: transaction.baseFeeCents,
  deliveryFeeCents: transaction.deliveryFeeCents,
  totalAmountCents: transaction.totalAmountCents,
});

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly createTransaction: CreateTransactionUseCase) {}

  @Post()
  async create(
    @Body() dto: CreateTransactionDto,
    @Req() request: Request,
  ): Promise<
    Result<
      TransactionResponse,
      NotFoundError | OutOfStockError | DuplicateReferenceError
    >
  > {
    const result = await this.createTransaction.execute({
      ...dto,
      ipAddress: resolveClientIp(request.ip),
    });
    return result.map(toResponse);
  }
}
