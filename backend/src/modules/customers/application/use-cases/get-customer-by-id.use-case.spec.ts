import { NotFoundError } from '../../../../shared/rop/errors';
import { Err, Ok } from '../../../../shared/rop/result';
import { Customer } from '../../domain/customer';
import { GetCustomerByIdUseCase } from './get-customer-by-id.use-case';

const customer: Customer = {
  id: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  documentType: 'CC',
  documentNumber: '1020304050',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phone: '3001112233',
};

describe('GetCustomerByIdUseCase', () => {
  it('returns the customer or NotFoundError', async () => {
    const findById = jest
      .fn()
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(null);
    const useCase = new GetCustomerByIdUseCase({ upsert: jest.fn(), findById });

    expect(((await useCase.execute(customer.id)) as Ok<Customer>).value).toBe(
      customer,
    );
    expect(
      ((await useCase.execute('missing')) as Err<NotFoundError>).error,
    ).toBeInstanceOf(NotFoundError);
  });
});
