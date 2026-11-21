import { NotFoundError } from '../../../../shared/rop/errors';
import { Err, Ok } from '../../../../shared/rop/result';
import { Product } from '../../domain/product';
import { IProductRepository } from '../../domain/product.repository.port';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';
import { GetProductsUseCase } from './get-products.use-case';

describe('Products use cases', () => {
  const product: Product = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Desk Lamp',
    description: 'LED lamp',
    priceInCents: 49900,
    stock: 1,
    imageUrl: '/images/products/desk-lamp.webp',
  };
  const repository: jest.Mocked<IProductRepository> = {
    findAll: jest.fn().mockResolvedValue([product]),
    findById: jest.fn(),
  };

  it('lists the products as Ok', async () => {
    const result = await new GetProductsUseCase(repository).execute();

    expect((result as Ok<Product[]>).value).toEqual([product]);
  });

  it('returns Ok when the product exists and Err(NotFoundError) when it does not', async () => {
    const useCase = new GetProductByIdUseCase(repository);
    repository.findById.mockResolvedValueOnce(product);
    repository.findById.mockResolvedValueOnce(null);

    const found = await useCase.execute(product.id);
    const missing = await useCase.execute('unknown');

    expect((found as Ok<Product>).value).toBe(product);
    expect((missing as Err<NotFoundError>).error).toBeInstanceOf(NotFoundError);
  });
});
