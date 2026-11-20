import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { GetTransactionByIdUseCase } from './application/use-cases/get-transaction-by-id.use-case';
import { GetQuoteUseCase } from './application/use-cases/get-quote.use-case';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment.use-case';
import { PAYMENT_SETTLEMENT } from './domain/payment-settlement.port';
import { FEES_PROVIDER } from './domain/fees';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { EnvFeesProvider } from './infrastructure/fees.provider';
import { QuoteController } from './infrastructure/quote.controller';
import { PaymentSettlementTypeOrm } from './infrastructure/payment-settlement.typeorm';
import { TransactionOrmEntity } from './infrastructure/transaction.orm-entity';
import { TransactionTypeOrmRepository } from './infrastructure/transaction.typeorm.repository';
import { TransactionsController } from './infrastructure/transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity]),
    ProductsModule,
    CustomersModule,
    PaymentsModule,
  ],
  controllers: [TransactionsController, QuoteController],
  providers: [
    CreateTransactionUseCase,
    GetQuoteUseCase,
    ProcessPaymentUseCase,
    GetTransactionByIdUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionTypeOrmRepository },
    { provide: PAYMENT_SETTLEMENT, useClass: PaymentSettlementTypeOrm },
    { provide: FEES_PROVIDER, useClass: EnvFeesProvider },
  ],
})
export class TransactionsModule {}
