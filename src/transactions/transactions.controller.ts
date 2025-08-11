import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  ParseFloatPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { TransactionStatus } from './entities/transaction.entity';
import { PaginatedResponseDto, ErrorResponseDto } from '../common/dto/api-response.dto';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER, UserRole.TENANT_ADMIN)
  @ApiOperation({
    summary: 'Create a new transaction',
    description: 'Processes a new payment transaction. The transaction will go through fraud detection and risk assessment before processing.',
  })
  @ApiBody({ type: CreateTransactionDto })
  @ApiCreatedResponse({
    description: 'Transaction created and processed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        transactionId: { type: 'string' },
        type: { type: 'string', enum: ['payment', 'refund', 'chargeback', 'adjustment'] },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] },
        amount: { type: 'number', format: 'decimal' },
        currency: { type: 'string' },
        paymentMethod: { type: 'string' },
        merchantId: { type: 'string', format: 'uuid' },
        customerEmail: { type: 'string', format: 'email' },
        riskAssessment: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            level: { type: 'string', enum: ['low', 'medium', 'high'] },
            recommendation: { type: 'string', enum: ['approve', 'review', 'decline'] },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid transaction data or business rules violation',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
    type: ErrorResponseDto,
  })
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.create(createTransactionDto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'merchantId', required: false, type: String, description: 'Filter by merchant ID' })
  @ApiQuery({ name: 'paymentMethod', required: false, type: String, description: 'Filter by payment method' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'minAmount', required: false, type: Number, description: 'Minimum amount' })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number, description: 'Maximum amount' })
  @ApiQuery({ name: 'customerEmail', required: false, type: String, description: 'Filter by customer email' })
  findAll(
    @TenantId() tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('status') status?: TransactionStatus,
    @Query('merchantId') merchantId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('customerEmail') customerEmail?: string,
  ) {
    const filters = {
      status,
      merchantId,
      paymentMethod,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minAmount,
      maxAmount,
      customerEmail,
    };

    return this.transactionsService.findAll(tenantId, filters, page, limit);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.TENANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get transaction statistics' })
  @ApiResponse({ status: 200, description: 'Transaction statistics' })
  @ApiQuery({ name: 'merchantId', required: false, type: String, description: 'Filter by merchant ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  getStats(
    @TenantId() tenantId: string,
    @Query('merchantId') merchantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.transactionsService.getTransactionStats(
      tenantId,
      merchantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.transactionsService.findOne(id, tenantId);
  }

  @Get('by-transaction-id/:transactionId')
  @ApiOperation({ summary: 'Get transaction by transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  findByTransactionId(
    @Param('transactionId') transactionId: string,
    @TenantId() tenantId: string,
  ) {
    return this.transactionsService.findByTransactionId(transactionId, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @TenantId() tenantId: string,
  ) {
    return this.transactionsService.update(id, updateTransactionDto, tenantId);
  }

  @Post(':transactionId/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Refund a transaction' })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot refund this transaction' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  refund(
    @Param('transactionId') transactionId: string,
    @Body('amount', ParseFloatPipe) amount: number,
    @Body('reason') reason: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.refund(transactionId, amount, reason, tenantId, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Cancel a pending transaction' })
  @ApiResponse({ status: 200, description: 'Transaction cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel this transaction' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @TenantId() tenantId: string,
  ) {
    return this.transactionsService.cancel(id, tenantId, reason);
  }
}
