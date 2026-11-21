import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import { Product } from '../../domain/product';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/product.repository.port';

@Injectable()
export class GetProductByIdUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
  ) {}

  async execute(id: string): Promise<Result<Product, NotFoundError>> {
    const product = await this.products.findById(id);
    return product
      ? ok(product)
      : err(new NotFoundError(`Product ${id} not found`));
  }
}
