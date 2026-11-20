import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ShippingAddressDto } from '../../../deliveries/infrastructure/dto/shipping-address.dto';

export class CardDto {
  @Matches(/^\d{13,19}$/)
  number!: string;

  @Matches(/^\d{3}$/)
  cvc!: string;

  @Matches(/^(0[1-9]|1[0-2])$/)
  expMonth!: string;

  @Matches(/^\d{2}$/)
  expYear!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  holder!: string;
}

export class PayTransactionDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CardDto)
  card!: CardDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shipping!: ShippingAddressDto;

  @IsString()
  @IsNotEmpty()
  acceptanceToken!: string;

  @IsString()
  @IsNotEmpty()
  personalAuthToken!: string;
}
