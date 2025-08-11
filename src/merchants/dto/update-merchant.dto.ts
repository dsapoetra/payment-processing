import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateMerchantDto } from './create-merchant.dto';
import { MerchantStatus, KYCStatus } from '../entities/merchant.entity';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({
    description: 'Merchant status',
    enum: MerchantStatus,
  })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;

  @ApiPropertyOptional({
    description: 'KYC status',
    enum: KYCStatus,
  })
  @IsOptional()
  @IsEnum(KYCStatus)
  kycStatus?: KYCStatus;
}
