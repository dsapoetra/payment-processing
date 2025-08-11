import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUrl,
  Length,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MerchantType } from '../entities/merchant.entity';

class AddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State or province' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;
}

class BusinessDetailsDto {
  @ApiPropertyOptional({ description: 'Tax ID number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ description: 'Business registration number' })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: 'Year business was established' })
  @IsOptional()
  yearEstablished?: number;

  @ApiPropertyOptional({ description: 'Number of employees' })
  @IsOptional()
  employeeCount?: number;

  @ApiPropertyOptional({ description: 'Annual revenue' })
  @IsOptional()
  annualRevenue?: number;
}

export class CreateMerchantDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Acme Store',
  })
  @IsString()
  @Length(2, 255)
  businessName: string;

  @ApiProperty({
    description: 'Legal business name',
    example: 'Acme Store LLC',
  })
  @IsString()
  @Length(2, 255)
  legalName: string;

  @ApiProperty({
    description: 'Business email address',
    example: 'business@acmestore.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Business phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Business website',
    example: 'https://acmestore.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'Business type',
    enum: MerchantType,
    default: MerchantType.BUSINESS,
  })
  @IsEnum(MerchantType)
  type: MerchantType;

  @ApiPropertyOptional({
    description: 'Business description',
    example: 'Online retail store selling electronics',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Industry code',
    example: 'RETAIL',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({
    description: 'Business address',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional({
    description: 'Business details',
    type: BusinessDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  businessDetails?: BusinessDetailsDto;
}
