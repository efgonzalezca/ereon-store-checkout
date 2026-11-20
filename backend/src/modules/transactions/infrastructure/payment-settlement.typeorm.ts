import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutOfStockError } from '../../../shared/rop/errors';
import { err, ok, Result } from '../../../shared/rop/result';
import { DeliveryOrmEntity } from '../../deliveries/infrastructure/delivery.orm-entity';
import { ProductOrmEntity } from '../../products/infrastructure/product.orm-entity';
import {
  ApprovedPayment,
  IPaymentSettlement,
} from '../domain/payment-settlement.port';
import { Transaction } from '../domain/transaction';
import { toTransaction } from './transaction.mapper';
import { TransactionOrmEntity } from './transaction.orm-entity';

class StockUnavailable extends Error {}

@Injectable()
export class PaymentSettlementTypeOrm implements IPaymentSettlement {
  constructor(private readonly dataSource: DataSource) {}

  async settleApproved(
    payment: ApprovedPayment,
  ): Promise<Result<Transaction, OutOfStockError>> {
    try {
      const row = await this.dataSource.transaction(async (manager) => {
        const stock = await manager
          .createQueryBuilder()
          .update(ProductOrmEntity)
          .set({ stock: () => 'stock - :quantity' })
          .where('id = :productId AND stock >= :quantity')
          .setParameters({
            productId: payment.productId,
            quantity: payment.quantity,
          })
          .execute();
        if (!stock.affected) throw new StockUnavailable();

        await manager.update(
          TransactionOrmEntity,
          { id: payment.transactionId },
          { status: 'APPROVED', externalId: payment.externalId },
        );
        await manager.insert(DeliveryOrmEntity, {
          transactionId: payment.transactionId,
          customerId: payment.customerId,
          ...payment.shipping,
        });
        return manager.findOneByOrFail(TransactionOrmEntity, {
          id: payment.transactionId,
        });
      });
      return ok(toTransaction(row));
    } catch (error) {
      if (error instanceof StockUnavailable) {
        return err(new OutOfStockError('Not enough stock for this product'));
      }
      throw error;
    }
  }
}
