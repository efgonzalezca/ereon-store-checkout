import { CardRejectedError, GatewayError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';

export interface AcceptanceTokens {
  acceptanceToken: string;
  acceptancePermalink: string;
  personalAuthToken: string;
  personalAuthPermalink: string;
}

export const GATEWAY_STATUSES = [
  'APPROVED',
  'DECLINED',
  'VOIDED',
  'ERROR',
  'PENDING',
] as const;

export type GatewayStatus = (typeof GATEWAY_STATUSES)[number];

export interface CardData {
  readonly number: string;
  readonly cvc: string;
  readonly expMonth: string;
  readonly expYear: string;
  readonly holder: string;
}

export interface ChargeRequest {
  readonly reference: string;
  readonly amountInCents: number;
  readonly installments: number;
  readonly customerEmail: string;
  readonly card: CardData;
  readonly acceptanceToken: string;
  readonly personalAuthToken: string;
}

export interface ChargeResult {
  readonly status: GatewayStatus;
  readonly externalId: string;
}

export interface IPaymentGatewayPort {
  getAcceptanceTokens(): Promise<Result<AcceptanceTokens, GatewayError>>;
  charge(
    request: ChargeRequest,
  ): Promise<Result<ChargeResult, GatewayError | CardRejectedError>>;
}

export const PAYMENT_GATEWAY = Symbol('IPaymentGatewayPort');
