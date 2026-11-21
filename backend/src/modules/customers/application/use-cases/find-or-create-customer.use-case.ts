import { Inject, Injectable } from '@nestjs/common';
import { ok, Result } from '../../../../shared/rop/result';
import { Customer, CustomerData } from '../../domain/customer';
import {
  CUSTOMER_REPOSITORY,
  ICustomerRepository,
} from '../../domain/customer.repository.port';

@Injectable()
export class FindOrCreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customers: ICustomerRepository,
  ) {}

  async execute(data: CustomerData): Promise<Result<Customer, never>> {
    return ok(await this.customers.upsert(data));
  }
}
