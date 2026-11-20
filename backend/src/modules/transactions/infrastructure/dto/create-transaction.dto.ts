import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import {
  DOCUMENT_TYPES,
  DocumentType,
} from '../../../customers/domain/document-type';
import { MAX_INSTALLMENTS } from '../../domain/transaction';

export class CustomerDto {
  @IsIn(DOCUMENT_TYPES)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(120)
  email!: string;

  @Matches(/^\+?[\d\s()-]{7,25}$/)
  phone!: string;
}

export class CreateTransactionDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsInt()
  @Min(1)
  @Max(MAX_INSTALLMENTS)
  installments!: number;

  @IsUUID('4')
  reference!: string;

  @ValidateNested()
  @Type(() => CustomerDto)
  customer!: CustomerDto;
}
