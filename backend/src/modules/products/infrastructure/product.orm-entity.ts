import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
@Check('CHK_products_stock_non_negative', '"stock" >= 0')
@Check('CHK_products_price_non_negative', '"price_in_cents" >= 0')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'price_in_cents', type: 'int' })
  priceInCents!: number;

  @Column({ type: 'int' })
  stock!: number;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
