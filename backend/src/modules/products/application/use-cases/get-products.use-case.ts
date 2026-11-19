import { Inject, Injectable } from '@nestjs/common';
import { ok, Result } from '../../../../shared/rop/result';
import { Product } from '../../domain/product';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/product.repository.port';

@Injectable()
export class GetProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
  ) {}

  async execute(): Promise<Result<Product[]>> {
    return ok(await this.products.findAll());
  }
}
