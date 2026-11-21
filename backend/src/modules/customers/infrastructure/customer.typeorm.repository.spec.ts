import { Repository } from 'typeorm';
import { CustomerData } from '../domain/customer';
import { CustomerOrmEntity } from './customer.orm-entity';
import { CustomerTypeOrmRepository } from './customer.typeorm.repository';

describe('CustomerTypeOrmRepository', () => {
  it('upserts on the composite document key and returns the stored customer', async () => {
    const data: CustomerData = {
      documentType: 'CE',
      documentNumber: '987',
      fullName: 'John Roe',
      email: 'john@example.com',
      phone: '3000000000',
    };
    const row = {
      id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const typeorm = {
      upsert: jest.fn().mockResolvedValue(undefined),
      findOneByOrFail: jest.fn().mockResolvedValue(row),
    };
    const repository = new CustomerTypeOrmRepository(
      typeorm as unknown as Repository<CustomerOrmEntity>,
    );

    const customer = await repository.upsert(data);

    expect(typeorm.upsert).toHaveBeenCalledWith(data, [
      'documentType',
      'documentNumber',
    ]);
    expect(typeorm.findOneByOrFail).toHaveBeenCalledWith({
      documentType: 'CE',
      documentNumber: '987',
    });
    expect(customer).toEqual({
      id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
      ...data,
    });
  });

  it('finds a customer by id and returns null when it does not exist', async () => {
    const row = {
      id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
      documentType: 'CC',
      documentNumber: '123',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '3001112233',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const typeorm = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce(null),
    };
    const repository = new CustomerTypeOrmRepository(
      typeorm as unknown as Repository<CustomerOrmEntity>,
    );

    expect(await repository.findById(row.id)).toMatchObject({
      id: row.id,
      email: 'jane@example.com',
    });
    expect(await repository.findById('missing')).toBeNull();
  });
});
