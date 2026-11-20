import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GetAcceptanceTokensUseCase } from './application/use-cases/get-acceptance-tokens.use-case';
import { PAYMENT_GATEWAY } from './domain/payment-gateway.port';
import { PaymentGatewayAdapter } from './infrastructure/payment-gateway.adapter';
import { PaymentsController } from './infrastructure/payments.controller';

@Module({
  imports: [HttpModule],
  controllers: [PaymentsController],
  providers: [
    GetAcceptanceTokensUseCase,
    { provide: PAYMENT_GATEWAY, useClass: PaymentGatewayAdapter },
  ],
})
export class PaymentsModule {}
