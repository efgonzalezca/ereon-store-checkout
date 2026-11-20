import { Controller, Get } from '@nestjs/common';
import { GetAcceptanceTokensUseCase } from '../application/use-cases/get-acceptance-tokens.use-case';
import { AcceptanceTokens } from '../domain/payment-gateway.port';
import { GatewayError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly getAcceptanceTokens: GetAcceptanceTokensUseCase,
  ) {}

  @Get('acceptance-tokens')
  findAcceptanceTokens(): Promise<Result<AcceptanceTokens, GatewayError>> {
    return this.getAcceptanceTokens.execute();
  }
}
