import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerData } from '../domain/customer';
import { ICustomerRepository } from '../domain/customer.repository.port';
import { CustomerOrmEntity } from './customer.orm-entity';

@Injectable()
export class CustomerTypeOrmRepository implements ICustomerRepository {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly repository: Repository<CustomerOrmEntity>,
  ) {}

  async upsert(data: CustomerData): Promise<Customer> {
    const { documentType, documentNumber } = data;
    await this.repository.upsert(data, ['documentType', 'documentNumber']);
    const row = await this.repository.findOneByOrFail({
      documentType,
      documentNumber,
    });
    return {
      id: row.id,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
    };
  }
}
