import { DataSource } from 'typeorm';
import { OutOfStockError } from '../../../shared/rop/errors';
import { Err, Ok } from '../../../shared/rop/result';
import { ApprovedPayment } from '../domain/payment-settlement.port';
import { Transaction } from '../domain/transaction';
import { PaymentSettlementTypeOrm } from './payment-settlement.typeorm';

const payment: ApprovedPayment = {
  transactionId: 'c2b6c3f4-6a0b-4f06-9d3e-6a5f2f1d8a10',
  externalId: 'gw-1',
  productId: '00000000-0000-4000-8000-000000000001',
  customerId: '9b2e1c4a-7d3f-4a85-b6e0-1f4c8a2d5e77',
  quantity: 2,
  shipping: {
    address: 'Calle 1 # 2-3',
    city: 'Bogota',
    region: 'Cundinamarca',
    postalCode: '110111',
  },
};

const row = {
  id: payment.transactionId,
  reference: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  status: 'APPROVED',
  externalId: 'gw-1',
  productId: payment.productId,
  customerId: payment.customerId,
  quantity: 2,
  installments: 1,
  productAmountCents: 1,
  baseFeeCents: 1,
  deliveryFeeCents: 1,
  totalAmountCents: 3,
  ipAddress: null,
};

interface FakeBuilder {
  update: () => FakeBuilder;
  set: () => FakeBuilder;
  where: () => FakeBuilder;
  setParameters: jest.Mock;
  execute: jest.Mock;
}

function build(affected: number) {
  const builder: FakeBuilder = {
    update: () => builder,
    set: () => builder,
    where: () => builder,
    setParameters: jest.fn(() => builder),
    execute: jest.fn().mockResolvedValue({ affected }),
  };
  const manager = {
    createQueryBuilder: () => builder,
    update: jest.fn().mockResolvedValue(undefined),
    insert: jest.fn().mockResolvedValue(undefined),
    findOneByOrFail: jest.fn().mockResolvedValue(row),
  };
  const dataSource = {
    transaction: (work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
  } as unknown as DataSource;
  return {
    settlement: new PaymentSettlementTypeOrm(dataSource),
    manager,
    builder,
  };
}

describe('PaymentSettlementTypeOrm', () => {
  it('discounts the stock, approves the transaction and creates the delivery together', async () => {
    const { settlement, manager, builder } = build(1);

    const result = await settlement.settleApproved(payment);

    expect((result as Ok<Transaction>).value).toMatchObject({
      status: 'APPROVED',
      externalId: 'gw-1',
    });
    expect(builder.setParameters).toHaveBeenCalledWith({
      productId: payment.productId,
      quantity: 2,
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: payment.transactionId },
      { status: 'APPROVED', externalId: 'gw-1' },
    );
    expect(manager.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        transactionId: payment.transactionId,
        customerId: payment.customerId,
        city: 'Bogota',
      }),
    );
  });

  it('rolls back with OutOfStockError when no stock row was updated', async () => {
    const { settlement, manager } = build(0);

    const result = await settlement.settleApproved(payment);

    expect((result as Err<OutOfStockError>).error).toBeInstanceOf(
      OutOfStockError,
    );
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('rethrows unexpected database errors', async () => {
    const { settlement, manager } = build(1);
    manager.insert.mockRejectedValue(new Error('connection lost'));

    await expect(settlement.settleApproved(payment)).rejects.toThrow(
      'connection lost',
    );
  });
});
