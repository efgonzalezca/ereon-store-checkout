import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/rop/errors';
import { err, ok, Result } from '../../../../shared/rop/result';
import { Customer } from '../../domain/customer';
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from '../../domain/customer.repository.port';

@Injectable()
export class GetCustomerByIdUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: ICustomerRepository,
  ) {}

  async execute(id: string): Promise<Result<Customer, NotFoundError>> {
    const customer = await this.customers.findById(id);
    return customer
      ? ok(customer)
      : err(new NotFoundError('Customer not found'));
  }
}
