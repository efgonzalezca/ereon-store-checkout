import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTable1795147932486 implements MigrationInterface {
  name = 'CreateTransactionsTable1795147932486';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "product_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "quantity" integer NOT NULL, "installments" integer NOT NULL, "product_amount_cents" integer NOT NULL, "base_fee_cents" integer NOT NULL, "delivery_fee_cents" integer NOT NULL, "total_amount_cents" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "ip_address" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference"), CONSTRAINT "CHK_transactions_amounts" CHECK ("product_amount_cents" >= 0 AND "base_fee_cents" >= 0 AND "delivery_fee_cents" >= 0 AND "total_amount_cents" >= 0), CONSTRAINT "CHK_transactions_installments" CHECK ("installments" BETWEEN 1 AND 36), CONSTRAINT "CHK_transactions_quantity" CHECK ("quantity" > 0), CONSTRAINT "CHK_transactions_status" CHECK ("status" IN ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_8d5b2e87f2129081ebacc894f8f" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD CONSTRAINT "FK_6f09843c214f21a462b54b11e8d" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_6f09843c214f21a462b54b11e8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_8d5b2e87f2129081ebacc894f8f"`,
    );
    await queryRunner.query(`DROP TABLE "transactions"`);
  }
}
