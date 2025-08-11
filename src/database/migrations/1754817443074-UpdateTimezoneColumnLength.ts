import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTimezoneColumnLength1754817443074 implements MigrationInterface {
    name = 'UpdateTimezoneColumnLength1754817443074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('payment', 'refund', 'chargeback', 'adjustment')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_paymentmethod_enum" AS ENUM('credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'cryptocurrency')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_currency_enum" AS ENUM('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "transactionId" character varying(50) NOT NULL, "externalTransactionId" character varying(50), "type" "public"."transactions_type_enum" NOT NULL DEFAULT 'payment', "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending', "paymentMethod" "public"."transactions_paymentmethod_enum" NOT NULL, "amount" numeric(15,2) NOT NULL, "currency" "public"."transactions_currency_enum" NOT NULL DEFAULT 'USD', "feeAmount" numeric(15,2) NOT NULL DEFAULT '0', "netAmount" numeric(15,2) NOT NULL DEFAULT '0', "description" text, "orderId" character varying(50), "customerEmail" character varying(255), "customerPhone" character varying(20), "customerDetails" jsonb, "paymentDetails" jsonb, "riskAssessment" jsonb, "failureCode" character varying(10), "failureReason" text, "processedAt" TIMESTAMP WITH TIME ZONE, "settledAt" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, "parentTransactionId" character varying(50), "ipAddress" inet, "userAgent" text, "tenantId" uuid NOT NULL, "merchantId" uuid NOT NULL, CONSTRAINT "UQ_1eb69759461752029252274c105" UNIQUE ("transactionId"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0889059971d198758bb6e60fd0" ON "transactions" ("paymentMethod") `);
        await queryRunner.query(`CREATE INDEX "IDX_e744417ceb0b530285c08f3865" ON "transactions" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_da87c55b3bbbe96c6ed88ea7ee" ON "transactions" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1eb69759461752029252274c10" ON "transactions" ("transactionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_88088ff46b6a3f09e1be51d35c" ON "transactions" ("merchantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_948098d3c352bcd1d25c429a33" ON "transactions" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."merchants_type_enum" AS ENUM('individual', 'business', 'corporation', 'non_profit')`);
        await queryRunner.query(`CREATE TYPE "public"."merchants_status_enum" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'suspended', 'active')`);
        await queryRunner.query(`CREATE TYPE "public"."merchants_kycstatus_enum" AS ENUM('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'expired')`);
        await queryRunner.query(`CREATE TABLE "merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "merchantId" character varying(50) NOT NULL, "businessName" character varying(255) NOT NULL, "legalName" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "phoneNumber" character varying(20), "website" character varying(255), "type" "public"."merchants_type_enum" NOT NULL DEFAULT 'business', "status" "public"."merchants_status_enum" NOT NULL DEFAULT 'pending', "kycStatus" "public"."merchants_kycstatus_enum" NOT NULL DEFAULT 'not_started', "description" text, "industry" character varying(10), "address" jsonb, "businessDetails" jsonb, "kycDocuments" jsonb, "paymentSettings" jsonb, "processingVolume" numeric(10,2) NOT NULL DEFAULT '0', "transactionCount" integer NOT NULL DEFAULT '0', "approvedAt" TIMESTAMP WITH TIME ZONE, "lastTransactionAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "tenantId" uuid NOT NULL, CONSTRAINT "UQ_e1ea10b341b4f0038df95649315" UNIQUE ("merchantId"), CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_d710df010cb11514bc819c5c03" ON "merchants" ("email", "tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e1ea10b341b4f0038df9564931" ON "merchants" ("merchantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_01bf35ccd9225e7aabe56bc5a3" ON "merchants" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'suspended', 'inactive')`);
        await queryRunner.query(`CREATE TYPE "public"."tenants_plan_enum" AS ENUM('starter', 'professional', 'enterprise')`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "name" character varying(255) NOT NULL, "subdomain" character varying(100) NOT NULL, "domain" character varying(255), "description" text, "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'active', "plan" "public"."tenants_plan_enum" NOT NULL DEFAULT 'starter', "apiKey" character varying(64) NOT NULL, "settings" jsonb, "limits" jsonb, "trialEndsAt" TIMESTAMP WITH TIME ZONE, "lastActivityAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_21bb89e012fa5b58532009c1601" UNIQUE ("subdomain"), CONSTRAINT "UQ_30dec5cd2d1f58a2682a9c77bb8" UNIQUE ("apiKey"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_30dec5cd2d1f58a2682a9c77bb" ON "tenants" ("apiKey") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_21bb89e012fa5b58532009c160" ON "tenants" ("subdomain") `);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('create', 'update', 'delete', 'login', 'logout', 'access', 'export', 'approve', 'reject', 'suspend', 'activate')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_level_enum" AS ENUM('info', 'warning', 'error', 'critical')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "level" "public"."audit_logs_level_enum" NOT NULL DEFAULT 'info', "entityType" character varying(100) NOT NULL, "entityId" uuid, "description" text NOT NULL, "oldValues" jsonb, "newValues" jsonb, "metadata" jsonb, "source" character varying(255), "isSecurityEvent" boolean NOT NULL DEFAULT false, "isPciRelevant" boolean NOT NULL DEFAULT false, "tenantId" uuid NOT NULL, "userId" uuid, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_76566a7a3b90863650d467bff6" ON "audit_logs" ("level") `);
        await queryRunner.query(`CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "audit_logs" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_01993ae76b293d3b866cc3a125" ON "audit_logs" ("entityType") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_cfa83f61e4d27a87fcae1e025a" ON "audit_logs" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_889633a4291bcb0bf4680fff23" ON "audit_logs" ("tenantId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'tenant_admin', 'merchant_admin', 'merchant_user', 'analyst', 'support')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'pending_verification')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "createdBy" uuid, "updatedBy" uuid, "email" character varying(255) NOT NULL, "firstName" character varying(255) NOT NULL, "lastName" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'merchant_user', "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending_verification', "phoneNumber" character varying(20), "timezone" character varying(50), "preferences" jsonb, "permissions" jsonb, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "emailVerifiedAt" TIMESTAMP WITH TIME ZONE, "emailVerificationToken" character varying(255), "passwordResetToken" character varying(255), "passwordResetExpiresAt" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "tenantId" uuid NOT NULL, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c58f7e88c286e5e3478960a998" ON "users" ("tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7346b08032078107fce81e014f" ON "users" ("email", "tenantId") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_948098d3c352bcd1d25c429a33b" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_88088ff46b6a3f09e1be51d35c4" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "merchants" ADD CONSTRAINT "FK_01bf35ccd9225e7aabe56bc5a32" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_889633a4291bcb0bf4680fff234" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_c58f7e88c286e5e3478960a998b" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c58f7e88c286e5e3478960a998b"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_889633a4291bcb0bf4680fff234"`);
        await queryRunner.query(`ALTER TABLE "merchants" DROP CONSTRAINT "FK_01bf35ccd9225e7aabe56bc5a32"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_88088ff46b6a3f09e1be51d35c4"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_948098d3c352bcd1d25c429a33b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7346b08032078107fce81e014f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c58f7e88c286e5e3478960a998"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_889633a4291bcb0bf4680fff23"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfa83f61e4d27a87fcae1e025a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c69efb19bf127c97e6740ad530"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76566a7a3b90863650d467bff6"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_level_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_21bb89e012fa5b58532009c160"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_30dec5cd2d1f58a2682a9c77bb"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_plan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_01bf35ccd9225e7aabe56bc5a3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e1ea10b341b4f0038df9564931"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d710df010cb11514bc819c5c03"`);
        await queryRunner.query(`DROP TABLE "merchants"`);
        await queryRunner.query(`DROP TYPE "public"."merchants_kycstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."merchants_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."merchants_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_948098d3c352bcd1d25c429a33"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88088ff46b6a3f09e1be51d35c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1eb69759461752029252274c10"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da87c55b3bbbe96c6ed88ea7ee"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e744417ceb0b530285c08f3865"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0889059971d198758bb6e60fd0"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_currency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
    }

}
