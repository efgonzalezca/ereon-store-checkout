import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomersTable1795130392153 implements MigrationInterface {
  name = 'CreateCustomersTable1795130392153';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_type" character varying NOT NULL, "document_number" character varying NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_customers_document" UNIQUE ("document_type", "document_number"), CONSTRAINT "CHK_customers_document_type" CHECK ("document_type" IN ('CC', 'CE', 'NIT', 'PP', 'TI', 'DNI', 'RG', 'OTHER')), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "customers"`);
  }
}
