import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  CHARGEBACK = 'chargeback',
  ADJUSTMENT = 'adjustment',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD',
}

@Entity('transactions')
@Index(['tenantId'])
@Index(['merchantId'])
@Index(['transactionId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
@Index(['paymentMethod'])
export class Transaction extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  transactionId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  externalTransactionId?: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.PAYMENT,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.USD,
  })
  currency: Currency;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  feeAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netAmount: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone?: string;

  @Column({ type: 'jsonb', nullable: true })
  customerDetails?: {
    name?: string;
    address?: Record<string, string>;
    metadata?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails?: {
    cardLast4?: string;
    cardBrand?: string;
    cardType?: string;
    bankName?: string;
    walletProvider?: string;
    cryptoAddress?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  riskAssessment?: {
    score: number;
    level: 'low' | 'medium' | 'high';
    factors: string[];
    fraudProbability: number;
  };

  @Column({ type: 'varchar', length: 10, nullable: true })
  failureCode?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  settledAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  parentTransactionId?: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  // Multi-tenant relation
  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  // Merchant relation
  @Column({ type: 'uuid' })
  merchantId: string;

  @ManyToOne(() => Merchant, (merchant) => merchant.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;
}
