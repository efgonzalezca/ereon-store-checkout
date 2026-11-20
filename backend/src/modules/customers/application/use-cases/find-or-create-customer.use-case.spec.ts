import { Ok } from '../../../../shared/rop/result';
import { Customer, CustomerData } from '../../domain/customer';
import { FindOrCreateCustomerUseCase } from './find-or-create-customer.use-case';

describe('FindOrCreateCustomerUseCase', () => {
  it('upserts the customer by document and returns it as Ok', async () => {
    const data: CustomerData = {
      documentType: 'CC',
      documentNumber: '123456',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '3001234567',
    };
    const saved: Customer = {
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      ...data,
    };
    const upsert = jest.fn().mockResolvedValue(saved);

    const result = await new FindOrCreateCustomerUseCase({
      upsert,
      findById: jest.fn(),
    }).execute(data);

    expect(upsert).toHaveBeenCalledWith(data);
    expect((result as Ok<Customer>).value).toBe(saved);
  });
});
