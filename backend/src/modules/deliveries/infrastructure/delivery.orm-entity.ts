import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DELIVERY_STATUSES, DeliveryStatus } from '../domain/delivery';

const statusValues = DELIVERY_STATUSES.map((status) => `'${status}'`).join(
  ', ',
);

@Entity('deliveries')
@Unique('UQ_deliveries_transaction', ['transactionId'])
@Check('CHK_deliveries_status', `"status" IN (${statusValues})`)
export class DeliveryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @OneToOne('TransactionOrmEntity', { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: unknown;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @ManyToOne('CustomerOrmEntity', { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: unknown;

  @Column({ type: 'varchar' })
  address!: string;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  region!: string;

  @Column({ name: 'postal_code', type: 'varchar' })
  postalCode!: string;

  @Column({ type: 'varchar', default: 'ASSIGNED' })
  status!: DeliveryStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
