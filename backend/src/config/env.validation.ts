import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

const trim = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV!: 'development' | 'production' | 'test';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  @IsUrl(
    {
      require_protocol: true,
      require_tld: false,
      require_valid_protocol: true,
    },
    { each: true },
  )
  CORS_ORIGIN!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_TTL!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT!: number;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT!: number;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  DB_USER!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASS!: string;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  DB_NAME!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  DB_SSL!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  TRUST_PROXY_HOPS!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  BASE_FEE_CENTS!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  DELIVERY_FEE_CENTS!: number;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsUrl({
    require_protocol: true,
    require_tld: false,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
  })
  PAYMENT_API_URL!: string;

  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @IsNotEmpty()
  PAYMENT_PUBLIC_KEY!: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return validated;
}
