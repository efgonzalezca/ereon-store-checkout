import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { CreateTransactionUseCase } from '../application/use-cases/create-transaction.use-case';
import {
  ProcessPaymentError,
  ProcessPaymentUseCase,
} from '../application/use-cases/process-payment.use-case';
import { Transaction } from '../domain/transaction';
import {
  DuplicateReferenceError,
  NotFoundError,
  OutOfStockError,
} from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { resolveClientIp } from './client-ip';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PayTransactionDto } from './dto/pay-transaction.dto';
import { PAY_THROTTLE } from './pay-throttle';

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
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly processPayment: ProcessPaymentUseCase,
    private readonly logger: Logger,
  ) {}

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

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @Throttle(PAY_THROTTLE)
  async pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayTransactionDto,
  ): Promise<Result<TransactionResponse, ProcessPaymentError>> {
    const result = await this.processPayment.execute({
      transactionId: id,
      ...dto,
    });
    if (result.isOk) {
      this.logger.log(
        {
          action: 'payment_processed',
          transactionId: id,
          status: result.value.status,
        },
        'Payment processed',
      );
    }
    return result.map(toResponse);
  }
}
