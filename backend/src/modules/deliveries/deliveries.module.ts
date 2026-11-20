import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryOrmEntity } from './infrastructure/delivery.orm-entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryOrmEntity])],
})
export class DeliveriesModule {}
