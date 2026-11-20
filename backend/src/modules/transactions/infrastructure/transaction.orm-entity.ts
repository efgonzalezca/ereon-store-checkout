import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  MAX_INSTALLMENTS,
  TRANSACTION_STATUSES,
  TransactionStatus,
} from '../domain/transaction';

const statusValues = TRANSACTION_STATUSES.map((s) => `'${s}'`).join(', ');

@Entity('transactions')
@Unique('UQ_transactions_reference', ['reference'])
@Check('CHK_transactions_status', `"status" IN (${statusValues})`)
@Check('CHK_transactions_quantity', '"quantity" > 0')
@Check(
  'CHK_transactions_installments',
  `"installments" BETWEEN 1 AND ${MAX_INSTALLMENTS}`,
)
@Check(
  'CHK_transactions_amounts',
  '"product_amount_cents" >= 0 AND "base_fee_cents" >= 0 AND "delivery_fee_cents" >= 0 AND "total_amount_cents" >= 0',
)
export class TransactionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  reference!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne('ProductOrmEntity', { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product?: unknown;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne('CustomerOrmEntity', { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: unknown;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  installments!: number;

  @Column({ name: 'product_amount_cents', type: 'int' })
  productAmountCents!: number;

  @Column({ name: 'base_fee_cents', type: 'int' })
  baseFeeCents!: number;

  @Column({ name: 'delivery_fee_cents', type: 'int' })
  deliveryFeeCents!: number;

  @Column({ name: 'total_amount_cents', type: 'int' })
  totalAmountCents!: number;

  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  externalId!: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: TransactionStatus;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
