import { Inject, Injectable } from '@nestjs/common';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../../products/domain/product.repository.port';
import { NotFoundError, OutOfStockError } from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import {
  calculateAmounts,
  FEES_PROVIDER,
  IFeesProvider,
} from '../../domain/fees';
import { Amounts } from '../../domain/transaction';

@Injectable()
export class GetQuoteUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: IProductRepository,
    @Inject(FEES_PROVIDER) private readonly fees: IFeesProvider,
  ) {}

  async execute(
    productId: string,
    quantity: number,
  ): Promise<Result<Amounts, NotFoundError | OutOfStockError>> {
    const product = await this.products.findById(productId);
    if (!product) return err(new NotFoundError('Product not found'));
    if (product.stock < quantity) {
      return err(new OutOfStockError('Not enough stock for this product'));
    }
    return ok(
      calculateAmounts(product.priceInCents, quantity, this.fees.getFees()),
    );
  }
}
