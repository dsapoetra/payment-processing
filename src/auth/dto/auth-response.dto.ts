import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

export class UserProfileDto {
  @ApiProperty({ 
    description: 'User unique identifier',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ 
    description: 'User email address',
    format: 'email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({ 
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({ 
    description: 'User role within the organization',
    enum: UserRole,
    example: UserRole.MERCHANT_USER,
  })
  role: UserRole;

  @ApiProperty({ 
    description: 'User account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({ 
    description: 'Tenant ID the user belongs to',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({ 
    description: 'User phone number',
    example: '+1-555-123-4567',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({ 
    description: 'User timezone',
    example: 'America/New_York',
    required: false,
  })
  timezone?: string;

  @ApiProperty({ 
    description: 'Last login timestamp',
    format: 'date-time',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
  })
  lastLoginAt?: string;

  @ApiProperty({ 
    description: 'Account creation timestamp',
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({ 
    description: 'Last update timestamp',
    format: 'date-time',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: string;
}

export class AuthResponseDto {
  @ApiProperty({ 
    description: 'User profile information',
    type: UserProfileDto,
  })
  user: UserProfileDto;

  @ApiProperty({ 
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ 
    description: 'Refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({ 
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({ 
    description: 'Token type',
    example: 'Bearer',
    default: 'Bearer',
  })
  tokenType: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ 
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ 
    description: 'New refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({ 
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({ 
    description: 'Token type',
    example: 'Bearer',
    default: 'Bearer',
  })
  tokenType: string;
}
