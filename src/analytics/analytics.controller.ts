import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { RealtimeAnalyticsService } from './services/realtime-analytics.service';
import { KpiService } from './services/kpi.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReportFilters } from './interfaces/analytics.interface';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly realtimeAnalyticsService: RealtimeAnalyticsService,
    private readonly kpiService: KpiService,
  ) {}

  @Get('realtime')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get real-time analytics data' })
  @ApiResponse({ status: 200, description: 'Real-time analytics data retrieved successfully' })
  async getRealtime(@TenantId() tenantId: string) {
    const [transactionMetrics, merchantMetrics] = await Promise.all([
      this.realtimeAnalyticsService.getRealtimeTransactionMetrics(tenantId),
      this.realtimeAnalyticsService.getRealtimeMerchantMetrics(tenantId),
    ]);

    return {
      transactionVolume: {
        total: transactionMetrics.totalVolume,
        count: transactionMetrics.totalTransactions,
        averageAmount: transactionMetrics.averageTransactionValue,
      },
      merchantMetrics: {
        totalMerchants: merchantMetrics.totalMerchants,
        activeMerchants: merchantMetrics.activeMerchants,
        pendingApprovals: merchantMetrics.pendingMerchants,
      },
      riskMetrics: {
        averageRiskScore: 0.25, // Default risk score
        highRiskTransactions: 0,
        flaggedTransactions: 0,
      },
    };
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  getDashboard(@TenantId() tenantId: string) {
    return this.analyticsService.getDashboardData(tenantId);
  }

  @Get('transactions/metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get real-time transaction metrics' })
  @ApiResponse({ status: 200, description: 'Transaction metrics retrieved successfully' })
  getTransactionMetrics(@TenantId() tenantId: string) {
    return this.realtimeAnalyticsService.getRealtimeTransactionMetrics(tenantId);
  }

  @Get('merchants/metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get real-time merchant metrics' })
  @ApiResponse({ status: 200, description: 'Merchant metrics retrieved successfully' })
  getMerchantMetrics(@TenantId() tenantId: string) {
    return this.realtimeAnalyticsService.getRealtimeMerchantMetrics(tenantId);
  }

  @Get('kpis')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get key performance indicators' })
  @ApiResponse({ status: 200, description: 'KPIs retrieved successfully' })
  getKpis(@TenantId() tenantId: string) {
    return this.kpiService.getKpis(tenantId);
  }

  @Get('transactions/timeseries')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get transaction time series data' })
  @ApiResponse({ status: 200, description: 'Time series data retrieved successfully' })
  @ApiQuery({ name: 'hours', required: false, type: Number, description: 'Number of hours to look back' })
  @ApiQuery({ name: 'interval', required: false, type: String, description: 'Time interval (minute, hour, day)' })
  getTransactionTimeSeries(
    @TenantId() tenantId: string,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('interval', new DefaultValuePipe('hour')) interval: string,
  ) {
    return this.realtimeAnalyticsService.getTransactionTimeSeries(tenantId, hours, interval);
  }

  @Get('merchants/top')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get top merchants by volume' })
  @ApiResponse({ status: 200, description: 'Top merchants retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of merchants to return' })
  getTopMerchants(
    @TenantId() tenantId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.realtimeAnalyticsService.getTopMerchantsByVolume(tenantId, limit);
  }

  @Get('revenue/metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully' })
  getRevenueMetrics(@TenantId() tenantId: string) {
    return this.kpiService.getRevenueMetrics(tenantId);
  }

  @Get('fraud/metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Get fraud detection metrics' })
  @ApiResponse({ status: 200, description: 'Fraud metrics retrieved successfully' })
  getFraudMetrics(@TenantId() tenantId: string) {
    return this.kpiService.getFraudMetrics(tenantId);
  }

  @Get('reports/generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TENANT_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.ANALYST)
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'merchantIds', required: false, type: [String], description: 'Filter by merchant IDs' })
  @ApiQuery({ name: 'paymentMethods', required: false, type: [String], description: 'Filter by payment methods' })
  @ApiQuery({ name: 'currencies', required: false, type: [String], description: 'Filter by currencies' })
  @ApiQuery({ name: 'statuses', required: false, type: [String], description: 'Filter by statuses' })
  @ApiQuery({ name: 'minAmount', required: false, type: Number, description: 'Minimum amount' })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number, description: 'Maximum amount' })
  generateReport(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('merchantIds') merchantIds?: string[],
    @Query('paymentMethods') paymentMethods?: string[],
    @Query('currencies') currencies?: string[],
    @Query('statuses') statuses?: string[],
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
  ) {
    const filters: ReportFilters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      merchantIds: Array.isArray(merchantIds) ? merchantIds : merchantIds ? [merchantIds] : undefined,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : paymentMethods ? [paymentMethods] : undefined,
      currencies: Array.isArray(currencies) ? currencies : currencies ? [currencies] : undefined,
      statuses: Array.isArray(statuses) ? statuses : statuses ? [statuses] : undefined,
      minAmount,
      maxAmount,
    };

    return this.analyticsService.generateReport(tenantId, filters);
  }
}
