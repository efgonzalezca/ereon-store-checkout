import { QueryFailedError, Repository } from 'typeorm';
import { DuplicateReferenceError } from '../../../shared/rop/errors';
import { Err, Ok } from '../../../shared/rop/result';
import { NewTransaction, Transaction } from '../domain/transaction';
import { TransactionOrmEntity } from './transaction.orm-entity';
import { TransactionTypeOrmRepository } from './transaction.typeorm.repository';

const data: NewTransaction = {
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  quantity: 1,
  installments: 1,
  productAmountCents: 8990000,
  baseFeeCents: 300000,
  deliveryFeeCents: 1200000,
  totalAmountCents: 10490000,
  ipAddress: null,
};

const row = {
  ...data,
  id: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
} as TransactionOrmEntity;

function build(overrides: Partial<Record<'save' | 'findOneBy', jest.Mock>>) {
  const repository = {
    create: (value: unknown) => value,
    save: overrides.save ?? jest.fn(),
    findOneBy: overrides.findOneBy ?? jest.fn(),
  };
  return new TransactionTypeOrmRepository(
    repository as unknown as Repository<TransactionOrmEntity>,
  );
}

describe('TransactionTypeOrmRepository', () => {
  it('creates a transaction and finds it by reference', async () => {
    const repo = build({
      save: jest.fn().mockResolvedValue(row),
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce(null),
    });

    const created = await repo.create(data);
    expect((created as Ok<Transaction>).value).toMatchObject({
      id: row.id,
      status: 'PENDING',
      totalAmountCents: 10490000,
    });
    expect(await repo.findByReference(data.reference)).toMatchObject({
      id: row.id,
    });
    expect(await repo.findByReference('missing')).toBeNull();
  });

  it('maps a unique violation to DuplicateReferenceError and rethrows anything else', async () => {
    const violation = new QueryFailedError(
      'insert',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );
    const duplicate = await build({
      save: jest.fn().mockRejectedValue(violation),
    }).create(data);
    expect((duplicate as Err<DuplicateReferenceError>).error).toBeInstanceOf(
      DuplicateReferenceError,
    );

    const failure = new Error('connection lost');
    await expect(
      build({ save: jest.fn().mockRejectedValue(failure) }).create(data),
    ).rejects.toBe(failure);
  });
});
