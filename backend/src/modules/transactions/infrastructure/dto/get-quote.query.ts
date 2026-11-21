import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';

export class GetQuoteQuery {
  @IsUUID()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
