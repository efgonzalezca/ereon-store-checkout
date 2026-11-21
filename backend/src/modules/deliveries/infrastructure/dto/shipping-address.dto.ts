import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  region!: string;

  @Matches(/^[A-Za-z0-9-]{3,10}$/)
  postalCode!: string;
}
