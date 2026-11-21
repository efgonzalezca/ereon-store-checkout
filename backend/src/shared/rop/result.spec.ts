import { NotFoundError, OutOfStockError } from './errors';
import { Err, Ok, err, isResult, ok, Result } from './result';

describe('Result', () => {
  it('chains Ok values with map and flatMap', () => {
    const result = ok(2)
      .map((n) => n * 3)
      .flatMap((n) => ok(n + 1));

    expect((result as Ok<number>).value).toBe(7);
  });

  it('propagates the first error and skips later steps', () => {
    const error = new OutOfStockError('no stock');
    const later = jest.fn();
    const start: Result<number, NotFoundError> = err(new NotFoundError('x'));

    const failedInside = ok(2).flatMap(() => err(error));
    const skipped = start.map(later).flatMap(later);

    expect((failedInside as Err<OutOfStockError>).error).toBe(error);
    expect(skipped).toBe(start);
    expect(later).not.toHaveBeenCalled();
  });

  it('recognizes results and rejects other values', () => {
    expect(isResult(ok(1))).toBe(true);
    expect(isResult(err(new NotFoundError('x')))).toBe(true);
    expect(isResult({ isOk: true, value: 1 })).toBe(false);
  });
});
