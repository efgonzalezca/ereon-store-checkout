import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { GetProductsUseCase } from './application/use-cases/get-products.use-case';
import { PRODUCT_REPOSITORY } from './domain/product.repository.port';
import { ProductOrmEntity } from './infrastructure/product.orm-entity';
import { ProductTypeOrmRepository } from './infrastructure/product.typeorm.repository';
import { ProductsController } from './infrastructure/products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductOrmEntity])],
  controllers: [ProductsController],
  providers: [
    GetProductsUseCase,
    GetProductByIdUseCase,
    { provide: PRODUCT_REPOSITORY, useClass: ProductTypeOrmRepository },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductsModule {}
