import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { DomainError } from '../rop/domain-error';
import {
  GatewayError,
  InvalidTransactionStateError,
  NotFoundError,
  OutOfStockError,
  PaymentDeclinedError,
  VoidedTransactionError,
} from '../rop/errors';
import { err, ok } from '../rop/result';
import { ResultInterceptor } from './result.interceptor';

class UnmappedError extends DomainError {
  readonly code = 'UNMAPPED';
}

describe('ResultInterceptor', () => {
  const interceptor = new ResultInterceptor();
  const run = (value: unknown) =>
    lastValueFrom(
      interceptor.intercept(
        {} as ExecutionContext,
        {
          handle: () => of(value),
        } as CallHandler,
      ),
    );

  it('unwraps Ok and passes through values that are not a Result', async () => {
    await expect(run(ok({ id: 1 }))).resolves.toEqual({ id: 1 });
    await expect(run({ status: 'ok' })).resolves.toEqual({ status: 'ok' });
  });

  it('maps each domain error to its HTTP status', async () => {
    const cases: Array<[DomainError, number]> = [
      [new NotFoundError('m'), 404],
      [new OutOfStockError('m'), 409],
      [new InvalidTransactionStateError('m'), 409],
      [new PaymentDeclinedError('m'), 422],
      [new VoidedTransactionError('m'), 422],
      [new GatewayError('m'), 502],
    ];

    for (const [error, status] of cases) {
      const thrown = (await run(err(error)).catch(
        (e: unknown) => e,
      )) as HttpException;

      expect(thrown.getStatus()).toBe(status);
      expect(thrown.getResponse()).toEqual({
        statusCode: status,
        code: error.code,
        message: 'm',
      });
    }
  });

  it('rethrows unmapped domain errors so they surface as 500', async () => {
    const error = new UnmappedError('boom');

    await expect(run(err(error))).rejects.toBe(error);
  });
});
