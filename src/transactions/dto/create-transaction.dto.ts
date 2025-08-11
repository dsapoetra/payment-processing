import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  IsUUID,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionType,
  PaymentMethod,
  Currency,
} from '../entities/transaction.entity';

class CustomerDetailsDto {
  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Additional customer metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class PaymentDetailsDto {
  @ApiPropertyOptional({ description: 'Last 4 digits of card' })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({ description: 'Card brand (Visa, Mastercard, etc.)' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ description: 'Card type (credit, debit)' })
  @IsOptional()
  @IsString()
  cardType?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Digital wallet provider' })
  @IsOptional()
  @IsString()
  walletProvider?: string;

  @ApiPropertyOptional({ description: 'Cryptocurrency address' })
  @IsOptional()
  @IsString()
  cryptoAddress?: string;
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    default: TransactionType.PAYMENT,
  })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Transaction amount',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: Currency,
    default: Currency.USD,
  })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({
    description: 'Merchant ID',
    example: 'uuid-string',
  })
  @IsUUID()
  merchantId: string;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Payment for order #12345',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Order ID',
    example: 'ORD-12345',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Customer details',
    type: CustomerDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails?: CustomerDetailsDto;

  @ApiPropertyOptional({
    description: 'Payment details',
    type: PaymentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;

  @ApiPropertyOptional({
    description: 'External transaction ID from payment processor',
    example: 'ext_txn_12345',
  })
  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'web', campaign: 'summer2024' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Customer IP address',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0...',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
