import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindOrCreateCustomerUseCase } from './application/use-cases/find-or-create-customer.use-case';
import { CUSTOMER_REPOSITORY } from './domain/customer.repository.port';
import { CustomerOrmEntity } from './infrastructure/customer.orm-entity';
import { CustomerTypeOrmRepository } from './infrastructure/customer.typeorm.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity])],
  providers: [
    FindOrCreateCustomerUseCase,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerTypeOrmRepository },
  ],
  exports: [FindOrCreateCustomerUseCase],
})
export class CustomersModule {}
