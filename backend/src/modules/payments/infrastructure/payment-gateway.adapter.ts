import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { Logger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { EnvironmentVariables } from '../../../config/env.validation';
import { GatewayError } from '../../../shared/rop/errors';
import { err, ok, Result } from '../../../shared/rop/result';
import {
  AcceptanceTokens,
  IPaymentGatewayPort,
} from '../domain/payment-gateway.port';

const REQUEST_TIMEOUT_MS = 5000;

interface GatewayAcceptance {
  acceptance_token?: unknown;
  permalink?: unknown;
}

interface MerchantInfoResponse {
  data?: {
    presigned_acceptance?: GatewayAcceptance;
    presigned_personal_data_auth?: GatewayAcceptance;
  };
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

@Injectable()
export class PaymentGatewayAdapter implements IPaymentGatewayPort {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly logger: Logger,
  ) {}

  async getAcceptanceTokens(): Promise<Result<AcceptanceTokens, GatewayError>> {
    const baseUrl = this.config.get<string>('PAYMENT_API_URL');
    const publicKey = this.config.get<string>('PAYMENT_PUBLIC_KEY');

    try {
      const { data } = await firstValueFrom(
        this.http.get<MerchantInfoResponse>(`${baseUrl}/v1/merchants/info`, {
          headers: { 'x-merchant-public-key': publicKey },
          timeout: REQUEST_TIMEOUT_MS,
        }),
      );

      const acceptance = data?.data?.presigned_acceptance;
      const personalAuth = data?.data?.presigned_personal_data_auth;

      if (
        !isText(acceptance?.acceptance_token) ||
        !isText(acceptance?.permalink) ||
        !isText(personalAuth?.acceptance_token) ||
        !isText(personalAuth?.permalink)
      ) {
        return this.fail('invalid_response');
      }

      return ok({
        acceptanceToken: acceptance.acceptance_token,
        acceptancePermalink: acceptance.permalink,
        personalAuthToken: personalAuth.acceptance_token,
        personalAuthPermalink: personalAuth.permalink,
      });
    } catch (error) {
      const reason = isAxiosError(error)
        ? `${error.code ?? 'UNKNOWN'}:${error.response?.status ?? 'no_response'}`
        : 'unexpected';
      return this.fail(reason);
    }
  }

  private fail(reason: string): Result<never, GatewayError> {
    this.logger.warn(
      { action: 'acceptance_tokens_failed', reason },
      'Payment gateway acceptance tokens request failed',
    );
    return err(new GatewayError('Payment gateway is unavailable'));
  }
}
