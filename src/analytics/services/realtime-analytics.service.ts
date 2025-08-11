import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { Merchant, MerchantStatus } from '../../merchants/entities/merchant.entity';
import { TransactionMetrics, MerchantMetrics, TimeSeriesData } from '../interfaces/analytics.interface';

@Injectable()
export class RealtimeAnalyticsService {
  private metricsCache = new Map<string, any>();
  private readonly cacheTimeout = 30000; // 30 seconds

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly configService: ConfigService,
  ) {}

  async getRealtimeTransactionMetrics(tenantId: string): Promise<TransactionMetrics> {
    const cacheKey = `transaction_metrics_${tenantId}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', { startDate: last24Hours })
      .getMany();

    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalFees = transactions.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    const successfulTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
    const failedTransactions = transactions.filter(t => t.status === TransactionStatus.FAILED);
    const chargebacks = transactions.filter(t => t.type === 'chargeback');
    const refunds = transactions.filter(t => t.type === 'refund');

    const successRate = totalTransactions > 0 ? (successfulTransactions.length / totalTransactions) * 100 : 0;
    const failureRate = totalTransactions > 0 ? (failedTransactions.length / totalTransactions) * 100 : 0;
    const chargebackRate = totalTransactions > 0 ? (chargebacks.length / totalTransactions) * 100 : 0;
    const refundRate = totalTransactions > 0 ? (refunds.length / totalTransactions) * 100 : 0;

    const metrics: TransactionMetrics = {
      totalTransactions,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      chargebackRate: Math.round(chargebackRate * 100) / 100,
      refundRate: Math.round(refundRate * 100) / 100,
    };

    this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
    return metrics;
  }

  async getRealtimeMerchantMetrics(tenantId: string): Promise<MerchantMetrics> {
    const cacheKey = `merchant_metrics_${tenantId}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const merchants = await this.merchantRepository.find({
      where: { tenantId },
    });

    const totalMerchants = merchants.length;
    const activeMerchants = merchants.filter(m => m.status === MerchantStatus.ACTIVE).length;
    const pendingMerchants = merchants.filter(m => m.status === MerchantStatus.PENDING).length;
    const suspendedMerchants = merchants.filter(m => m.status === MerchantStatus.SUSPENDED).length;

    const approvedMerchants = merchants.filter(m => m.kycStatus === 'approved').length;
    const kycApprovalRate = totalMerchants > 0 ? (approvedMerchants / totalMerchants) * 100 : 0;

    // Calculate average onboarding time
    const completedMerchants = merchants.filter(m => m.approvedAt);
    const averageOnboardingTime = completedMerchants.length > 0
      ? completedMerchants.reduce((sum, m) => {
          const onboardingTime = m.approvedAt!.getTime() - m.createdAt.getTime();
          return sum + onboardingTime;
        }, 0) / completedMerchants.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    const metrics: MerchantMetrics = {
      totalMerchants,
      activeMerchants,
      pendingMerchants,
      suspendedMerchants,
      kycApprovalRate: Math.round(kycApprovalRate * 100) / 100,
      averageOnboardingTime: Math.round(averageOnboardingTime * 100) / 100,
    };

    this.metricsCache.set(cacheKey, { data: metrics, timestamp: Date.now() });
    return metrics;
  }

  async getTransactionTimeSeries(
    tenantId: string,
    hours = 24,
    interval = 'hour',
  ): Promise<TimeSeriesData[]> {
    const cacheKey = `transaction_timeseries_${tenantId}_${hours}_${interval}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

    let dateFormat: string;
    let intervalMinutes: number;

    switch (interval) {
      case 'minute':
        dateFormat = 'YYYY-MM-DD HH24:MI:00';
        intervalMinutes = 1;
        break;
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        intervalMinutes = 60;
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD 00:00:00';
        intervalMinutes = 1440;
        break;
      default:
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        intervalMinutes = 60;
    }

    const query = `
      SELECT
        TO_CHAR("createdAt", '${dateFormat}') as time_bucket,
        COUNT(*) as transaction_count,
        SUM(amount) as total_volume
      FROM transactions
      WHERE "tenantId" = $1
        AND "createdAt" >= $2
        AND "createdAt" <= $3
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const rawResults = await this.transactionRepository.query(query, [
      tenantId,
      startDate,
      now,
    ]);

    // Fill in missing time buckets with zero values
    const timeSeries: TimeSeriesData[] = [];
    const currentTime = new Date(startDate);

    while (currentTime <= now) {
      const timeString = this.formatDateForBucket(currentTime, interval);
      const existingData = rawResults.find(r => r.time_bucket === timeString);

      timeSeries.push({
        timestamp: new Date(currentTime),
        value: existingData ? parseFloat(existingData.total_volume) || 0 : 0,
        label: timeString,
      });

      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }

    this.metricsCache.set(cacheKey, { data: timeSeries, timestamp: Date.now() });
    return timeSeries;
  }

  async getTopMerchantsByVolume(tenantId: string, limit = 10) {
    const cacheKey = `top_merchants_${tenantId}_${limit}`;
    const cached = this.metricsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .select([
        'merchant.merchantId as merchantId',
        'merchant.businessName as businessName',
        'SUM(transaction.amount) as volume',
        'COUNT(transaction.id) as transactions',
        'SUM(transaction.feeAmount) as revenue',
      ])
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', { startDate: last30Days })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('merchant.id')
      .addGroupBy('merchant.merchantId')
      .addGroupBy('merchant.businessName')
      .orderBy('volume', 'DESC')
      .limit(limit);

    const results = await query.getRawMany();

    const topMerchants = results.map(r => ({
      merchantId: r.merchantid,  // Note: lowercase from raw query
      businessName: r.businessname,  // Note: lowercase from raw query
      volume: parseFloat(r.volume) || 0,
      transactions: parseInt(r.transactions) || 0,
      revenue: parseFloat(r.revenue) || 0,
    }));

    this.metricsCache.set(cacheKey, { data: topMerchants, timestamp: Date.now() });
    return topMerchants;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  private clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.metricsCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.metricsCache.delete(key);
      }
    }
  }

  private formatDateForBucket(date: Date, interval: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    switch (interval) {
      case 'minute':
        return `${year}-${month}-${day} ${hour}:${minute}:00`;
      case 'hour':
        return `${year}-${month}-${day} ${hour}:00:00`;
      case 'day':
        return `${year}-${month}-${day} 00:00:00`;
      default:
        return `${year}-${month}-${day} ${hour}:00:00`;
    }
  }
}
