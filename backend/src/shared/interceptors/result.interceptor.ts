import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DomainError } from '../rop/domain-error';
import {
  DuplicateReferenceError,
  GatewayError,
  InvalidTransactionStateError,
  NotFoundError,
  OutOfStockError,
  PaymentDeclinedError,
  VoidedTransactionError,
} from '../rop/errors';
import { isResult } from '../rop/result';

const STATUS_BY_ERROR = new Map<object, HttpStatus>([
  [NotFoundError, HttpStatus.NOT_FOUND],
  [OutOfStockError, HttpStatus.CONFLICT],
  [InvalidTransactionStateError, HttpStatus.CONFLICT],
  [PaymentDeclinedError, HttpStatus.UNPROCESSABLE_ENTITY],
  [VoidedTransactionError, HttpStatus.UNPROCESSABLE_ENTITY],
  [DuplicateReferenceError, HttpStatus.UNPROCESSABLE_ENTITY],
  [GatewayError, HttpStatus.BAD_GATEWAY],
]);

@Injectable()
export class ResultInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        if (!isResult(response)) {
          return response;
        }
        if (response.isOk) {
          return response.value;
        }
        throw this.toException(response.error);
      }),
    );
  }

  private toException(error: DomainError): Error {
    const status = STATUS_BY_ERROR.get(error.constructor);
    if (!status) {
      return error;
    }
    return new HttpException(
      { statusCode: status, code: error.code, message: error.message },
      status,
    );
  }
}
