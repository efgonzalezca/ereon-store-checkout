import { ShippingAddress } from '../../deliveries/domain/delivery';
import { OutOfStockError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { Transaction } from './transaction';

export interface ApprovedPayment {
  readonly transactionId: string;
  readonly externalId: string;
  readonly productId: string;
  readonly customerId: string;
  readonly quantity: number;
  readonly shipping: ShippingAddress;
}

export interface IPaymentSettlement {
  settleApproved(
    payment: ApprovedPayment,
  ): Promise<Result<Transaction, OutOfStockError>>;
}

export const PAYMENT_SETTLEMENT = Symbol('IPaymentSettlement');
