import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';
import { TransactionStatus } from '../entities/transaction.entity';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @ApiPropertyOptional({
    description: 'Transaction status',
    enum: TransactionStatus,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Failure code',
    example: 'INSUFFICIENT_FUNDS',
  })
  @IsOptional()
  failureCode?: string;

  @ApiPropertyOptional({
    description: 'Failure reason',
    example: 'The card has insufficient funds',
  })
  @IsOptional()
  failureReason?: string;
}
