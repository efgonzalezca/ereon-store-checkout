import { GatewayError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';

export interface AcceptanceTokens {
  acceptanceToken: string;
  acceptancePermalink: string;
  personalAuthToken: string;
  personalAuthPermalink: string;
}

export interface IPaymentGatewayPort {
  getAcceptanceTokens(): Promise<Result<AcceptanceTokens, GatewayError>>;
}

export const PAYMENT_GATEWAY = Symbol('IPaymentGatewayPort');
