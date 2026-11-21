import { Controller, Get, Query } from '@nestjs/common';
import { GetQuoteUseCase } from '../application/use-cases/get-quote.use-case';
import { Amounts } from '../domain/transaction';
import { NotFoundError, OutOfStockError } from '../../../shared/rop/errors';
import { Result } from '../../../shared/rop/result';
import { GetQuoteQuery } from './dto/get-quote.query';

@Controller('quote')
export class QuoteController {
  constructor(private readonly getQuote: GetQuoteUseCase) {}

  @Get()
  findQuote(
    @Query() query: GetQuoteQuery,
  ): Promise<Result<Amounts, NotFoundError | OutOfStockError>> {
    return this.getQuote.execute(query.productId, query.quantity);
  }
}
