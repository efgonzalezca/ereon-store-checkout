import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { ProductsModule } from '../products/products.module';
import { CreateTransactionUseCase } from './application/use-cases/create-transaction.use-case';
import { GetQuoteUseCase } from './application/use-cases/get-quote.use-case';
import { FEES_PROVIDER } from './domain/fees';
import { TRANSACTION_REPOSITORY } from './domain/transaction.repository.port';
import { EnvFeesProvider } from './infrastructure/fees.provider';
import { QuoteController } from './infrastructure/quote.controller';
import { TransactionOrmEntity } from './infrastructure/transaction.orm-entity';
import { TransactionTypeOrmRepository } from './infrastructure/transaction.typeorm.repository';
import { TransactionsController } from './infrastructure/transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionOrmEntity]),
    ProductsModule,
    CustomersModule,
  ],
  controllers: [TransactionsController, QuoteController],
  providers: [
    CreateTransactionUseCase,
    GetQuoteUseCase,
    { provide: TRANSACTION_REPOSITORY, useClass: TransactionTypeOrmRepository },
    { provide: FEES_PROVIDER, useClass: EnvFeesProvider },
  ],
})
export class TransactionsModule {}
