import { IsString, IsOptional, IsEnum, IsUrl, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantPlan } from '../entities/tenant.entity';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name', example: 'Acme Corporation' })
  @IsString()
  @Length(2, 255)
  name: string;

  @ApiProperty({ 
    description: 'Unique subdomain for the tenant', 
    example: 'acme',
    pattern: '^[a-z0-9-]+$'
  })
  @IsString()
  @Length(3, 100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiPropertyOptional({ 
    description: 'Custom domain for the tenant', 
    example: 'payments.acme.com' 
  })
  @IsOptional()
  @IsUrl()
  domain?: string;

  @ApiPropertyOptional({ 
    description: 'Description of the tenant', 
    example: 'Payment processing for Acme Corporation' 
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Tenant plan', 
    enum: TenantPlan,
    default: TenantPlan.STARTER 
  })
  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @ApiPropertyOptional({ 
    description: 'Tenant settings as JSON object',
    example: { theme: 'dark', notifications: true }
  })
  @IsOptional()
  settings?: Record<string, any>;
}
