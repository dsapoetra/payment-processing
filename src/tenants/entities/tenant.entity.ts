import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('tenants')
@Index(['subdomain'], { unique: true })
@Index(['apiKey'], { unique: true })
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.STARTER,
  })
  plan: TenantPlan;

  @Column({ type: 'varchar', length: 64, unique: true })
  apiKey: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  limits?: {
    maxUsers?: number;
    maxMerchants?: number;
    maxTransactionsPerMonth?: number;
    maxApiCallsPerMinute?: number;
  };

  @Column({ type: 'timestamp with time zone', nullable: true })
  trialEndsAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastActivityAt?: Date;

  // Relations
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Merchant, (merchant) => merchant.tenant)
  merchants: Merchant[];

  @OneToMany(() => Transaction, (transaction) => transaction.tenant)
  transactions: Transaction[];
}
