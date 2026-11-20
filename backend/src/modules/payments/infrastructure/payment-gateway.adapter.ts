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
  ChargeRequest,
  ChargeResult,
  GATEWAY_STATUSES,
  GatewayStatus,
  IPaymentGatewayPort,
} from '../domain/payment-gateway.port';
import { encryptCard } from './card-encryption';
import { integritySignature } from './integrity-signature';

const REQUEST_TIMEOUT_MS = 5000;
const CHARGE_TIMEOUT_MS = 15000;
const POLL_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 1500;

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

interface TokenizationKeyResponse {
  data?: { publicKey?: unknown };
}

interface CardTokenResponse {
  data?: { id?: unknown };
}

interface GatewayTransactionResponse {
  data?: { id?: unknown; status?: unknown };
}

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isGatewayStatus = (value: unknown): value is GatewayStatus =>
  (GATEWAY_STATUSES as readonly unknown[]).includes(value);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class InvalidGatewayResponse extends Error {}

@Injectable()
export class PaymentGatewayAdapter implements IPaymentGatewayPort {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly logger: Logger,
  ) {}

  async getAcceptanceTokens(): Promise<Result<AcceptanceTokens, GatewayError>> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<MerchantInfoResponse>(this.url('/v1/merchants/info'), {
          headers: {
            'x-merchant-public-key':
              this.config.get<string>('PAYMENT_PUBLIC_KEY'),
          },
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
        return this.fail('acceptance_tokens_failed', 'invalid_response');
      }

      return ok({
        acceptanceToken: acceptance.acceptance_token,
        acceptancePermalink: acceptance.permalink,
        personalAuthToken: personalAuth.acceptance_token,
        personalAuthPermalink: personalAuth.permalink,
      });
    } catch (error) {
      return this.fail('acceptance_tokens_failed', this.reasonOf(error));
    }
  }

  async charge(
    request: ChargeRequest,
  ): Promise<Result<ChargeResult, GatewayError>> {
    try {
      const cardToken = await this.tokenizeCard(request);
      const created = await this.createTransaction(request, cardToken);
      const finalResult = await this.pollUntilFinal(created);
      return ok(finalResult);
    } catch (error) {
      return this.fail('charge_failed', this.reasonOf(error));
    }
  }

  private async tokenizeCard(request: ChargeRequest): Promise<string> {
    const publicKey = this.config.get<string>('PAYMENT_PUBLIC_KEY');

    const { data: keyResponse } = await firstValueFrom(
      this.http.get<TokenizationKeyResponse>(
        this.url('/v1/tokens/keys/tokenization'),
        { headers: this.bearer(publicKey), timeout: CHARGE_TIMEOUT_MS },
      ),
    );
    const publicKeyPem = keyResponse?.data?.publicKey;
    if (!isText(publicKeyPem)) throw new InvalidGatewayResponse();

    const payload = await encryptCard(publicKeyPem, request.card);
    const { data: tokenResponse } = await firstValueFrom(
      this.http.post<CardTokenResponse>(
        this.url('/v1/tokens/cards'),
        { payload },
        { headers: this.bearer(publicKey), timeout: CHARGE_TIMEOUT_MS },
      ),
    );
    const token = tokenResponse?.data?.id;
    if (!isText(token)) throw new InvalidGatewayResponse();
    return token;
  }

  private async createTransaction(
    request: ChargeRequest,
    cardToken: string,
  ): Promise<ChargeResult> {
    const currency = this.config.get<string>('PAYMENT_CURRENCY');
    const { data } = await firstValueFrom(
      this.http.post<GatewayTransactionResponse>(
        this.url('/v1/transactions'),
        {
          acceptance_token: request.acceptanceToken,
          accept_personal_auth: request.personalAuthToken,
          amount_in_cents: request.amountInCents,
          currency,
          signature: integritySignature(
            request.reference,
            request.amountInCents,
            currency,
            this.config.get<string>('PAYMENT_INTEGRITY_KEY'),
          ),
          customer_email: request.customerEmail,
          reference: request.reference,
          payment_method_type: 'CARD',
          payment_method: {
            type: 'CARD',
            token: cardToken,
            installments: request.installments,
          },
        },
        {
          headers: this.bearer(this.config.get<string>('PAYMENT_PRIVATE_KEY')),
          timeout: CHARGE_TIMEOUT_MS,
        },
      ),
    );
    return this.toResult(data);
  }

  private async pollUntilFinal(created: ChargeResult): Promise<ChargeResult> {
    let latest = created;
    for (let attempt = 0; latest.status === 'PENDING'; attempt += 1) {
      if (attempt === POLL_ATTEMPTS) break;
      await sleep(POLL_INTERVAL_MS);
      try {
        const { data } = await firstValueFrom(
          this.http.get<GatewayTransactionResponse>(
            this.url(`/v1/transactions/${created.externalId}`),
            {
              headers: this.bearer(
                this.config.get<string>('PAYMENT_PRIVATE_KEY'),
              ),
              timeout: CHARGE_TIMEOUT_MS,
            },
          ),
        );
        latest = this.toResult(data, created.externalId);
      } catch (error) {
        this.logger.warn(
          { action: 'charge_poll_failed', reason: this.reasonOf(error) },
          'Payment gateway status poll failed',
        );
      }
    }
    return latest;
  }

  private toResult(
    body: GatewayTransactionResponse,
    fallbackId?: string,
  ): ChargeResult {
    const id = body?.data?.id ?? fallbackId;
    const status = body?.data?.status;
    if (!isText(id) || !isGatewayStatus(status)) {
      throw new InvalidGatewayResponse();
    }
    return { status, externalId: id };
  }

  private url(path: string): string {
    return `${this.config.get<string>('PAYMENT_API_URL')}${path}`;
  }

  private bearer(key: string): Record<string, string> {
    return { Authorization: `Bearer ${key}` };
  }

  private reasonOf(error: unknown): string {
    if (isAxiosError(error)) {
      return `${error.code ?? 'UNKNOWN'}:${error.response?.status ?? 'no_response'}`;
    }
    return error instanceof InvalidGatewayResponse
      ? 'invalid_response'
      : 'unexpected';
  }

  private fail(action: string, reason: string): Result<never, GatewayError> {
    this.logger.warn({ action, reason }, 'Payment gateway request failed');
    return err(new GatewayError('Payment gateway is unavailable'));
  }
}
