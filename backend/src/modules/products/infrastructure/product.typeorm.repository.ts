import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../domain/product';
import { IProductRepository } from '../domain/product.repository.port';
import { ProductOrmEntity } from './product.orm-entity';

const toDomain = (row: ProductOrmEntity): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  priceInCents: row.priceInCents,
  stock: row.stock,
  imageUrl: row.imageUrl,
});

@Injectable()
export class ProductTypeOrmRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repository: Repository<ProductOrmEntity>,
  ) {}

  async findAll(): Promise<Product[]> {
    const rows = await this.repository.find({ order: { name: 'ASC' } });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Product | null> {
    const row = await this.repository.findOneBy({ id });
    return row ? toDomain(row) : null;
  }
}
