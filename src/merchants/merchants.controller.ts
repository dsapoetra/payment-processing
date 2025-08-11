import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto, ErrorResponseDto } from '../common/dto/api-response.dto';

@ApiTags('Merchants')
@Controller('merchants')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-auth')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN)
  @ApiOperation({
    summary: 'Create a new merchant',
    description: 'Creates a new merchant account with the provided information. Requires tenant admin or merchant admin role.',
  })
  @ApiBody({ type: CreateMerchantDto })
  @ApiCreatedResponse({
    description: 'Merchant created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        merchantId: { type: 'string' },
        businessName: { type: 'string' },
        contactEmail: { type: 'string', format: 'email' },
        status: { type: 'string', enum: ['pending', 'active', 'suspended', 'inactive'] },
        kycStatus: { type: 'string', enum: ['not_started', 'in_progress', 'approved', 'rejected'] },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Merchant with this email already exists',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions',
    type: ErrorResponseDto,
  })
  create(
    @Body() createMerchantDto: CreateMerchantDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.create(createMerchantDto, tenantId, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all merchants',
    description: 'Retrieves a list of all merchants for the current tenant.',
  })
  @ApiOkResponse({
    description: 'List of merchants retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          merchantId: { type: 'string' },
          businessName: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          status: { type: 'string' },
          kycStatus: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  findAll(@TenantId() tenantId: string) {
    return this.merchantsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get merchant by ID',
    description: 'Retrieves detailed information about a specific merchant by their UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Merchant UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Merchant found and retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        merchantId: { type: 'string' },
        businessName: { type: 'string' },
        contactEmail: { type: 'string', format: 'email' },
        contactPhone: { type: 'string' },
        businessAddress: { type: 'object' },
        status: { type: 'string' },
        kycStatus: { type: 'string' },
        kycDocuments: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponseDto,
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.merchantsService.findOne(id, tenantId);
  }

  @Get('by-merchant-id/:merchantId')
  @ApiOperation({ summary: 'Get merchant by merchant ID' })
  @ApiResponse({ status: 200, description: 'Merchant found' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  findByMerchantId(
    @Param('merchantId') merchantId: string,
    @TenantId() tenantId: string,
  ) {
    return this.merchantsService.findByMerchantId(merchantId, tenantId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN)
  @ApiOperation({ summary: 'Update merchant' })
  @ApiResponse({ status: 200, description: 'Merchant updated successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMerchantDto: UpdateMerchantDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.update(id, updateMerchantDto, tenantId, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete merchant' })
  @ApiResponse({ status: 200, description: 'Merchant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.remove(id, tenantId, user.id);
  }

  @Post(':id/kyc/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN)
  @ApiOperation({ summary: 'Start KYC process for merchant' })
  @ApiResponse({ status: 200, description: 'KYC process started' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  startKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.startKycProcess(id, tenantId, user.id);
  }

  @Post(':id/kyc/upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @ApiOperation({ summary: 'Upload KYC document' })
  @ApiResponse({ status: 200, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  uploadKycDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('documentType') documentType: string,
    @Body('documentUrl') documentUrl: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.uploadKycDocument(
      id,
      documentType,
      documentUrl,
      tenantId,
      user.id,
    );
  }

  @Post(':id/kyc/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve merchant KYC' })
  @ApiResponse({ status: 200, description: 'KYC approved successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  approveKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.approveKyc(id, tenantId, user.id);
  }

  @Post(':id/kyc/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject merchant KYC' })
  @ApiResponse({ status: 200, description: 'KYC rejected successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  rejectKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.rejectKyc(id, reason, tenantId, user.id);
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate merchant' })
  @ApiResponse({ status: 200, description: 'Merchant activated successfully' })
  @ApiResponse({ status: 400, description: 'KYC must be approved first' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.activateMerchant(id, tenantId, user.id);
  }

  @Post(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend merchant' })
  @ApiResponse({ status: 200, description: 'Merchant suspended successfully' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ) {
    return this.merchantsService.suspendMerchant(id, reason, tenantId, user.id);
  }
}
