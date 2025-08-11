import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum MerchantStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  ACTIVE = 'active',
}

export enum MerchantType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  CORPORATION = 'corporation',
  NON_PROFIT = 'non_profit',
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('merchants')
@Index(['tenantId'])
@Index(['merchantId'], { unique: true })
@Index(['email', 'tenantId'], { unique: true })
export class Merchant extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  merchantId: string;

  @Column({ type: 'varchar', length: 255 })
  businessName: string;

  @Column({ type: 'varchar', length: 255 })
  legalName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string;

  @Column({
    type: 'enum',
    enum: MerchantType,
    default: MerchantType.BUSINESS,
  })
  type: MerchantType;

  @Column({
    type: 'enum',
    enum: MerchantStatus,
    default: MerchantStatus.PENDING,
  })
  status: MerchantStatus;

  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.NOT_STARTED,
  })
  kycStatus: KYCStatus;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  industry?: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  businessDetails?: {
    taxId?: string;
    registrationNumber?: string;
    yearEstablished?: number;
    employeeCount?: number;
    annualRevenue?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  kycDocuments?: {
    businessLicense?: string;
    taxCertificate?: string;
    bankStatement?: string;
    identityDocument?: string;
    proofOfAddress?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  paymentSettings?: {
    acceptedPaymentMethods?: string[];
    settlementCurrency?: string;
    settlementSchedule?: string;
    processingFees?: Record<string, number>;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  processingVolume: number;

  @Column({ type: 'integer', default: 0 })
  transactionCount: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastTransactionAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Multi-tenant relation
  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.merchants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  // Relations
  @OneToMany(() => Transaction, (transaction) => transaction.merchant)
  transactions: Transaction[];
}
