import { Inject, Injectable } from '@nestjs/common';
import { GetCustomerByIdUseCase } from '../../../customers/application/use-cases/get-customer-by-id.use-case';
import { ShippingAddress } from '../../../deliveries/domain/delivery';
import {
  CardData,
  IPaymentGatewayPort,
  PAYMENT_GATEWAY,
} from '../../../payments/domain/payment-gateway.port';
import {
  CardRejectedError,
  GatewayError,
  InvalidTransactionStateError,
  NotFoundError,
  OutOfStockError,
} from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import { GetQuoteUseCase } from './get-quote.use-case';
import {
  IPaymentSettlement,
  PAYMENT_SETTLEMENT,
} from '../../domain/payment-settlement.port';
import { Transaction } from '../../domain/transaction';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../domain/transaction.repository.port';

export interface ProcessPaymentInput {
  readonly transactionId: string;
  readonly card: CardData;
  readonly shipping: ShippingAddress;
  readonly acceptanceToken: string;
  readonly personalAuthToken: string;
}

export type ProcessPaymentError =
  | NotFoundError
  | InvalidTransactionStateError
  | OutOfStockError
  | GatewayError
  | CardRejectedError;

@Injectable()
export class ProcessPaymentUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactions: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGatewayPort,
    @Inject(PAYMENT_SETTLEMENT) private readonly settlement: IPaymentSettlement,
    private readonly getCustomer: GetCustomerByIdUseCase,
    private readonly getQuote: GetQuoteUseCase,
  ) {}

  async execute(
    input: ProcessPaymentInput,
  ): Promise<Result<Transaction, ProcessPaymentError>> {
    const transaction = await this.transactions.findById(input.transactionId);
    if (!transaction) return err(new NotFoundError('Transaction not found'));
    if (transaction.status !== 'PENDING' || transaction.externalId !== null) {
      return err(
        new InvalidTransactionStateError('Transaction cannot be paid'),
      );
    }

    const customer = await this.getCustomer.execute(transaction.customerId);
    if (!customer.isOk) return customer;

    const availability = await this.getQuote.execute(
      transaction.productId,
      transaction.quantity,
    );
    if (!availability.isOk) return availability;

    const charge = await this.gateway.charge({
      reference: transaction.reference,
      amountInCents: transaction.totalAmountCents,
      installments: transaction.installments,
      customerEmail: customer.value.email,
      card: input.card,
      acceptanceToken: input.acceptanceToken,
      personalAuthToken: input.personalAuthToken,
    });
    if (!charge.isOk) return charge;

    const { status, externalId } = charge.value;
    if (status === 'APPROVED') {
      return this.settlement.settleApproved({
        transactionId: transaction.id,
        externalId,
        productId: transaction.productId,
        customerId: transaction.customerId,
        quantity: transaction.quantity,
        shipping: input.shipping,
      });
    }
    return ok(
      await this.transactions.saveOutcome(transaction.id, {
        status,
        externalId,
      }),
    );
  }
}
