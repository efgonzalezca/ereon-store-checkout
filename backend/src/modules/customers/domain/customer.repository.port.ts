import { Customer, CustomerData } from './customer';

export interface ICustomerRepository {
  upsert(data: CustomerData): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
}

export const CUSTOMER_REPOSITORY = Symbol('ICustomerRepository');
