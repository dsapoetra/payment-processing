import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, Length, Matches, IsEnum } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class PublicRegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  lastName: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,#^()_+=\-\[\]{}|\\:";'<>?/~`])[A-Za-z\d@$!%*?&.,#^()_+=\-\[\]{}|\\:";'<>?/~`]+$/,
    {
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'User phone number in international format',
    example: '+1-555-123-4567',
    pattern: '^\\+[1-9]\\d{1,14}$',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User timezone (IANA timezone identifier)',
    example: 'America/New_York',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255, { message: 'Organization name must be between 2 and 255 characters' })
  organizationName: string;

  @ApiPropertyOptional({
    description: 'Type of organization',
    example: 'startup',
    enum: ['startup', 'small_business', 'enterprise', 'non_profit', 'government', 'other'],
  })
  @IsOptional()
  @IsString()
  organizationType?: string;

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'e-commerce',
    enum: ['e-commerce', 'saas', 'fintech', 'healthcare', 'education', 'retail', 'manufacturing', 'other'],
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'Leading provider of innovative solutions',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Description must be less than 500 characters' })
  description?: string;
}
