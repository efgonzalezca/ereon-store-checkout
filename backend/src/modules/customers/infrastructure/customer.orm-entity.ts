import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DOCUMENT_TYPES, DocumentType } from '../domain/document-type';

const documentTypeValues = DOCUMENT_TYPES.map((type) => `'${type}'`).join(', ');

@Entity('customers')
@Unique('UQ_customers_document', ['documentType', 'documentNumber'])
@Check(
  'CHK_customers_document_type',
  `"document_type" IN (${documentTypeValues})`,
)
export class CustomerOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_type', type: 'varchar' })
  documentType!: DocumentType;

  @Column({ name: 'document_number', type: 'varchar' })
  documentNumber!: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
