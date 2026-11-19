import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  const logger = { error: jest.fn() };
  const filter = new GlobalExceptionFilter(logger as unknown as Logger);

  beforeEach(() => jest.clearAllMocks());

  it('logs unexpected errors and responds 500 without leaking details', () => {
    const error = new Error('db password leaked');

    filter.catch(error, host);

    expect(logger.error).toHaveBeenCalledWith(
      { err: error, action: 'unhandled_exception' },
      'Unhandled exception',
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('keeps the status and body of HTTP exceptions', () => {
    const exception = new BadRequestException('bad payload');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(exception.getResponse());
    expect(logger.error).not.toHaveBeenCalled();
  });
});
