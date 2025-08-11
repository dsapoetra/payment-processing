import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error details if request failed' })
  error?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId: string;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Indicates if there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Indicates if there is a previous page' })
  hasPrev: boolean;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Detailed error description' })
  details?: string;

  @ApiProperty({ description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request path that caused the error' })
  path: string;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  validationErrors?: string[];
}

export class SuccessResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId: string;
}
