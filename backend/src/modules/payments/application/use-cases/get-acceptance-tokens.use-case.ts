import { Inject, Injectable } from '@nestjs/common';
import { GatewayError } from '../../../../shared/rop/errors';
import { Result } from '../../../../shared/rop/result';
import {
  AcceptanceTokens,
  IPaymentGatewayPort,
  PAYMENT_GATEWAY,
} from '../../domain/payment-gateway.port';

@Injectable()
export class GetAcceptanceTokensUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGatewayPort,
  ) {}

  execute(): Promise<Result<AcceptanceTokens, GatewayError>> {
    return this.gateway.getAcceptanceTokens();
  }
}
