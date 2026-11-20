import { Transaction } from '../domain/transaction';
import { TransactionOrmEntity } from './transaction.orm-entity';

export const toTransaction = (row: TransactionOrmEntity): Transaction => ({
  id: row.id,
  reference: row.reference,
  status: row.status,
  externalId: row.externalId,
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
