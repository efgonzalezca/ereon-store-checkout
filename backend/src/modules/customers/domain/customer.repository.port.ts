import { Customer, CustomerData } from './customer';

export interface ICustomerRepository {
  upsert(data: CustomerData): Promise<Customer>;
}

export const CUSTOMER_REPOSITORY = Symbol('ICustomerRepository');
