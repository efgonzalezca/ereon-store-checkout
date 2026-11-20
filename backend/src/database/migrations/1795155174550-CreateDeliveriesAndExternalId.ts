import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliveriesAndExternalId1795155174550 implements MigrationInterface {
  name = 'CreateDeliveriesAndExternalId1795155174550';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "region" character varying NOT NULL, "postal_code" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'ASSIGNED', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_deliveries_transaction" UNIQUE ("transaction_id"), CONSTRAINT "REL_e7b05ec8e2e60b4c3fea6cbc0b" UNIQUE ("transaction_id"), CONSTRAINT "CHK_deliveries_status" CHECK ("status" IN ('ASSIGNED', 'SHIPPED', 'DELIVERED')), CONSTRAINT "PK_a6ef225c5c5f0974e503bfb731f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "external_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_e7b05ec8e2e60b4c3fea6cbc0bc" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_89c5783be020ff65d2d8dd0da85" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_89c5783be020ff65d2d8dd0da85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_e7b05ec8e2e60b4c3fea6cbc0bc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "external_id"`,
    );
    await queryRunner.query(`DROP TABLE "deliveries"`);
  }
}
