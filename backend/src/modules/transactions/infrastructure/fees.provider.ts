import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/env.validation';
import { Fees, IFeesProvider } from '../domain/fees';

@Injectable()
export class EnvFeesProvider implements IFeesProvider {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  getFees(): Fees {
    return {
      baseFeeCents: this.config.get<number>('BASE_FEE_CENTS'),
      deliveryFeeCents: this.config.get<number>('DELIVERY_FEE_CENTS'),
    };
  }
}
