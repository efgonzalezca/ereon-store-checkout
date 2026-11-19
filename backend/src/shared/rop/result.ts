import { DomainError } from './domain-error';

export class Ok<T> {
  readonly isOk = true as const;

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  flatMap<U, E2 extends DomainError>(
    fn: (value: T) => Result<U, E2>,
  ): Result<U, E2> {
    return fn(this.value);
  }
}

export class Err<E extends DomainError> {
  readonly isOk = false as const;

  constructor(readonly error: E) {}

  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this;
  }

  flatMap<U, E2 extends DomainError>(
    _fn: (value: never) => Result<U, E2>,
  ): Result<U, E | E2> {
    return this;
  }
}

export type Result<T, E extends DomainError = DomainError> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Result<T, never> => new Ok(value);

export const err = <E extends DomainError>(error: E): Result<never, E> =>
  new Err(error);

export const isResult = (value: unknown): value is Result<unknown> =>
  value instanceof Ok || value instanceof Err;
