import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThan, Between } from 'typeorm';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { Merchant, MerchantStatus } from '../../merchants/entities/merchant.entity';
import { KpiData, RevenueMetrics, FraudMetrics } from '../interfaces/analytics.interface';

@Injectable()
export class KpiService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
  ) {}

  async getKpis(tenantId: string): Promise<KpiData[]> {
    const [
      revenueMetrics,
      fraudMetrics,
      transactionVolume,
      merchantGrowth,
      averageTicketSize,
      customerRetention,
    ] = await Promise.all([
      this.getRevenueMetrics(tenantId),
      this.getFraudMetrics(tenantId),
      this.getTransactionVolumeKpi(tenantId),
      this.getMerchantGrowthKpi(tenantId),
      this.getAverageTicketSizeKpi(tenantId),
      this.getCustomerRetentionKpi(tenantId),
    ]);

    return [
      {
        name: 'Total Revenue',
        value: revenueMetrics.totalRevenue,
        previousValue: revenueMetrics.totalRevenue * 0.85, // Simulated previous period
        change: revenueMetrics.totalRevenue * 0.15,
        changePercentage: 15,
        trend: 'up',
        unit: '$',
        format: 'currency',
      },
      {
        name: 'Net Revenue',
        value: revenueMetrics.netRevenue,
        previousValue: revenueMetrics.netRevenue * 0.9,
        change: revenueMetrics.netRevenue * 0.1,
        changePercentage: 10,
        trend: 'up',
        unit: '$',
        format: 'currency',
      },
      {
        name: 'Revenue Growth',
        value: revenueMetrics.revenueGrowth,
        target: 20,
        trend: revenueMetrics.revenueGrowth > 0 ? 'up' : 'down',
        unit: '%',
        format: 'percentage',
      },
      {
        name: 'Fraud Rate',
        value: fraudMetrics.fraudRate,
        previousValue: fraudMetrics.fraudRate * 1.2,
        change: fraudMetrics.fraudRate * -0.2,
        changePercentage: -20,
        trend: 'down', // Lower fraud rate is better
        target: 1,
        unit: '%',
        format: 'percentage',
      },
      {
        name: 'Average Risk Score',
        value: fraudMetrics.averageRiskScore,
        previousValue: fraudMetrics.averageRiskScore * 1.1,
        change: fraudMetrics.averageRiskScore * -0.1,
        changePercentage: -10,
        trend: 'down', // Lower risk score is better
        target: 20,
        format: 'number',
      },
      transactionVolume,
      merchantGrowth,
      averageTicketSize,
      customerRetention,
    ];
  }

  async getRevenueMetrics(tenantId: string): Promise<RevenueMetrics> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Current month transactions
    const currentTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', { startDate: currentMonth })
      .andWhere('transaction.createdAt <= :endDate', { endDate: currentMonthEnd })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getMany();

    // Previous month transactions
    const previousTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', { startDate: previousMonth })
      .andWhere('transaction.createdAt < :endDate', { endDate: currentMonth })
      .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
      .getMany();

    const totalRevenue = currentTransactions.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const grossRevenue = currentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const netRevenue = grossRevenue - totalRevenue;

    const previousRevenue = previousTransactions.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const revenueGrowth = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Get active merchants for MRR calculation
    const activeMerchants = await this.merchantRepository.count({
      where: { tenantId, status: MerchantStatus.ACTIVE },
    });

    const monthlyRecurringRevenue = activeMerchants > 0 ? totalRevenue : 0;
    const averageRevenuePerMerchant = activeMerchants > 0 ? totalRevenue / activeMerchants : 0;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      averageRevenuePerMerchant: Math.round(averageRevenuePerMerchant * 100) / 100,
    };
  }

  async getFraudMetrics(tenantId: string): Promise<FraudMetrics> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt >= :startDate', { startDate: last30Days })
      .getMany();

    const totalTransactions = transactions.length;
    const fraudulentTransactions = transactions.filter(t => 
      t.riskAssessment && t.riskAssessment.level === 'high'
    );
    const blockedTransactions = transactions.filter(t => 
      t.status === TransactionStatus.FAILED && t.failureCode === 'FRAUD_SUSPECTED'
    );

    const totalFraudAttempts = fraudulentTransactions.length;
    const fraudRate = totalTransactions > 0 ? (totalFraudAttempts / totalTransactions) * 100 : 0;

    // Calculate average risk score
    const transactionsWithRisk = transactions.filter(t => t.riskAssessment);
    const averageRiskScore = transactionsWithRisk.length > 0
      ? transactionsWithRisk.reduce((sum, t) => sum + t.riskAssessment!.score, 0) / transactionsWithRisk.length
      : 0;

    // Simulate false positive rate (in real implementation, this would be tracked)
    const falsePositiveRate = Math.random() * 5; // 0-5%

    return {
      totalFraudAttempts,
      fraudRate: Math.round(fraudRate * 100) / 100,
      blockedTransactions: blockedTransactions.length,
      falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
    };
  }

  private async getTransactionVolumeKpi(tenantId: string): Promise<KpiData> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previous24Hours = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [currentVolume, previousVolume] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.tenantId = :tenantId', { tenantId })
        .andWhere('transaction.createdAt >= :startDate', { startDate: last24Hours })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.tenantId = :tenantId', { tenantId })
        .andWhere('transaction.createdAt >= :startDate', { startDate: previous24Hours })
        .andWhere('transaction.createdAt < :endDate', { endDate: last24Hours })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
    ]);

    const current = parseFloat(currentVolume?.total) || 0;
    const previous = parseFloat(previousVolume?.total) || 0;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    return {
      name: 'Transaction Volume (24h)',
      value: current,
      previousValue: previous,
      change,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      unit: '$',
      format: 'currency',
    };
  }

  private async getMerchantGrowthKpi(tenantId: string): Promise<KpiData> {
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

    const [currentCount, previousCount] = await Promise.all([
      this.merchantRepository.count({
        where: {
          tenantId,
          createdAt: MoreThanOrEqual(currentMonth),
          status: MerchantStatus.ACTIVE,
        },
      }),
      this.merchantRepository.count({
        where: {
          tenantId,
          createdAt: Between(previousMonth, currentMonth),
          status: MerchantStatus.ACTIVE,
        },
      }),
    ]);

    const change = currentCount - previousCount;
    const changePercentage = previousCount > 0 ? (change / previousCount) * 100 : 0;

    return {
      name: 'New Merchants (Monthly)',
      value: currentCount,
      previousValue: previousCount,
      change,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      format: 'number',
    };
  }

  private async getAverageTicketSizeKpi(tenantId: string): Promise<KpiData> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const previous30Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [currentData, previousData] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('AVG(transaction.amount)', 'average')
        .where('transaction.tenantId = :tenantId', { tenantId })
        .andWhere('transaction.createdAt >= :startDate', { startDate: last30Days })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('AVG(transaction.amount)', 'average')
        .where('transaction.tenantId = :tenantId', { tenantId })
        .andWhere('transaction.createdAt >= :startDate', { startDate: previous30Days })
        .andWhere('transaction.createdAt < :endDate', { endDate: last30Days })
        .andWhere('transaction.status = :status', { status: TransactionStatus.COMPLETED })
        .getRawOne(),
    ]);

    const current = parseFloat(currentData?.average) || 0;
    const previous = parseFloat(previousData?.average) || 0;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    return {
      name: 'Average Ticket Size',
      value: Math.round(current * 100) / 100,
      previousValue: Math.round(previous * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      unit: '$',
      format: 'currency',
    };
  }

  private async getCustomerRetentionKpi(tenantId: string): Promise<KpiData> {
    // Simulate customer retention rate (in real implementation, this would be calculated from actual data)
    const retentionRate = 75 + Math.random() * 20; // 75-95%
    const previousRetentionRate = retentionRate * (0.95 + Math.random() * 0.1);
    const change = retentionRate - previousRetentionRate;
    const changePercentage = (change / previousRetentionRate) * 100;

    return {
      name: 'Customer Retention Rate',
      value: Math.round(retentionRate * 100) / 100,
      previousValue: Math.round(previousRetentionRate * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      target: 85,
      unit: '%',
      format: 'percentage',
    };
  }
}
