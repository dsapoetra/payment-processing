import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RealtimeAnalyticsService } from './services/realtime-analytics.service';
import { KpiService } from './services/kpi.service';
import { ReportingService } from './services/reporting.service';
import { DashboardData, ReportFilters, ReportData } from './interfaces/analytics.interface';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly realtimeAnalyticsService: RealtimeAnalyticsService,
    private readonly kpiService: KpiService,
    private readonly reportingService: ReportingService,
  ) {}

  async getDashboardData(tenantId: string): Promise<DashboardData> {
    const [
      transactionMetrics,
      merchantMetrics,
      revenueMetrics,
      fraudMetrics,
      kpis,
      transactionTimeSeries,
      revenueTimeSeries,
      merchantTimeSeries,
      topMerchants,
      recentActivity,
    ] = await Promise.all([
      this.realtimeAnalyticsService.getRealtimeTransactionMetrics(tenantId),
      this.realtimeAnalyticsService.getRealtimeMerchantMetrics(tenantId),
      this.kpiService.getRevenueMetrics(tenantId),
      this.kpiService.getFraudMetrics(tenantId),
      this.kpiService.getKpis(tenantId),
      this.realtimeAnalyticsService.getTransactionTimeSeries(tenantId, 24, 'hour'),
      this.getRevenueTimeSeries(tenantId),
      this.getMerchantTimeSeries(tenantId),
      this.realtimeAnalyticsService.getTopMerchantsByVolume(tenantId, 10),
      this.getRecentActivity(tenantId),
    ]);

    return {
      transactionMetrics,
      merchantMetrics,
      revenueMetrics,
      fraudMetrics,
      kpis,
      timeSeries: {
        transactions: transactionTimeSeries,
        revenue: revenueTimeSeries,
        merchants: merchantTimeSeries,
      },
      topMerchants,
      recentActivity,
    };
  }

  async generateReport(tenantId: string, filters: ReportFilters): Promise<ReportData> {
    return await this.reportingService.generateReport(tenantId, filters);
  }

  private async getRevenueTimeSeries(tenantId: string) {
    // Get actual revenue time series data from transactions
    const hours = 24;
    const timeSeries: Array<{ timestamp: Date; value: number }> = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Query to get hourly revenue data
    const query = `
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM-DD HH24:00:00') as time_bucket,
        SUM("feeAmount") as total_revenue
      FROM transactions
      WHERE "tenantId" = $1
        AND "createdAt" >= $2
        AND "createdAt" <= $3
        AND "status" = 'completed'
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const rawResults = await this.transactionRepository.query(query, [
      tenantId,
      startDate,
      now,
    ]);

    // Fill in missing time buckets with zero values
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const timeString = timestamp.toISOString().substring(0, 13) + ':00:00';
      const existingData = rawResults.find(r => r.time_bucket === timeString);

      timeSeries.push({
        timestamp,
        value: existingData ? Math.round(parseFloat(existingData.total_revenue) * 100) / 100 : 0,
      });
    }

    return timeSeries;
  }

  private async getMerchantTimeSeries(tenantId: string) {
    // Get actual merchant growth time series data
    const days = 30;
    const timeSeries: Array<{ timestamp: Date; value: number }> = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Query to get daily merchant registration data
    const query = `
      SELECT
        DATE("createdAt") as registration_date,
        COUNT(*) as new_merchants
      FROM merchants
      WHERE "tenantId" = $1
        AND "createdAt" >= $2
        AND "createdAt" <= $3
      GROUP BY registration_date
      ORDER BY registration_date ASC
    `;

    const rawResults = await this.merchantRepository.query(query, [
      tenantId,
      startDate,
      now,
    ]);

    // Calculate cumulative merchant count
    let cumulativeMerchants = 0;

    // Get the initial count of merchants before the start date
    const initialCount = await this.merchantRepository.count({
      where: {
        tenantId,
        createdAt: LessThan(startDate),
      },
    });

    cumulativeMerchants = initialCount;

    // Fill in daily data with cumulative counts
    for (let i = days; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = timestamp.toISOString().split('T')[0];
      const dayData = rawResults.find(r => r.registration_date === dateString);

      if (dayData) {
        cumulativeMerchants += parseInt(dayData.new_merchants);
      }

      timeSeries.push({
        timestamp,
        value: cumulativeMerchants,
      });
    }

    return timeSeries;
  }

  private async getRecentActivity(tenantId: string) {
    // Get actual recent activity data from transactions and merchants
    const activities: Array<{
      type: string;
      description: string;
      timestamp: Date;
      amount?: number;
      merchantId: string;
    }> = [];

    // Get recent transactions (last 24 hours)
    const recentTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      })
      .orderBy('transaction.createdAt', 'DESC')
      .limit(10)
      .getMany();

    // Add transaction activities
    for (const transaction of recentTransactions) {
      let description = '';
      let type = 'transaction';

      if (transaction.amount > 1000) {
        description = `Large transaction processed: $${transaction.amount}`;
      } else if (transaction.status === 'failed') {
        description = `Transaction failed: $${transaction.amount}`;
        type = 'error';
      } else if (transaction.type === 'refund') {
        description = `Refund processed: $${transaction.amount}`;
        type = 'refund';
      } else {
        description = `Transaction processed: $${transaction.amount}`;
      }

      activities.push({
        type,
        description,
        timestamp: transaction.createdAt,
        amount: transaction.amount,
        merchantId: transaction.merchant?.merchantId || 'Unknown',
      });
    }

    // Get recent merchants (last 7 days)
    const recentMerchants = await this.merchantRepository
      .createQueryBuilder('merchant')
      .where('merchant.tenantId = :tenantId', { tenantId })
      .andWhere('merchant.createdAt >= :startDate', {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      })
      .orderBy('merchant.createdAt', 'DESC')
      .limit(5)
      .getMany();

    // Add merchant activities
    for (const merchant of recentMerchants) {
      let description = '';
      let type = 'merchant';

      if (merchant.status === 'active') {
        description = `New merchant approved: ${merchant.businessName}`;
      } else if (merchant.status === 'pending') {
        description = `New merchant registered: ${merchant.businessName}`;
      } else if (merchant.kycStatus === 'approved') {
        description = `KYC verification completed: ${merchant.businessName}`;
        type = 'kyc';
      }

      activities.push({
        type,
        description,
        timestamp: merchant.createdAt,
        merchantId: merchant.merchantId,
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Return top 10 most recent activities
    return activities.slice(0, 10);
  }
}
