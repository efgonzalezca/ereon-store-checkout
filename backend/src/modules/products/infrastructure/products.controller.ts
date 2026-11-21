import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { GetProductByIdUseCase } from '../application/use-cases/get-product-by-id.use-case';
import { GetProductsUseCase } from '../application/use-cases/get-products.use-case';
import { Product } from '../domain/product';
import { NotFoundError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProducts: GetProductsUseCase,
    private readonly getProductById: GetProductByIdUseCase,
  ) {}

  @Get()
  findAll(): Promise<Result<Product[]>> {
    return this.getProducts.execute();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Result<Product, NotFoundError>> {
    return this.getProductById.execute(id);
  }
}
