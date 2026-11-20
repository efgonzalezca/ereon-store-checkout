import { GatewayError } from '../../../../shared/rop/errors';
import { err, ok } from '../../../../shared/rop/result';
import { AcceptanceTokens } from '../../domain/payment-gateway.port';
import { GetAcceptanceTokensUseCase } from './get-acceptance-tokens.use-case';

const tokens: AcceptanceTokens = {
  acceptanceToken: 'acc_token',
  acceptancePermalink: 'https://legal.test/terms',
  personalAuthToken: 'personal_token',
  personalAuthPermalink: 'https://legal.test/data',
};

describe('GetAcceptanceTokensUseCase', () => {
  it('requests fresh tokens from the gateway on every call', async () => {
    const getAcceptanceTokens = jest.fn().mockResolvedValue(ok(tokens));
    const useCase = new GetAcceptanceTokensUseCase({
      getAcceptanceTokens,
      charge: jest.fn(),
    });

    await useCase.execute();
    const result = await useCase.execute();

    expect(getAcceptanceTokens).toHaveBeenCalledTimes(2);
    expect(result).toEqual(ok(tokens));
  });

  it('propagates gateway failures', async () => {
    const failure = err(new GatewayError('down'));
    const useCase = new GetAcceptanceTokensUseCase({
      getAcceptanceTokens: jest.fn().mockResolvedValue(failure),
      charge: jest.fn(),
    });

    expect(await useCase.execute()).toBe(failure);
  });
});
