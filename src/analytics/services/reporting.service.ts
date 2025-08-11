import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { ReportFilters, ReportData, TimeSeriesData } from '../interfaces/analytics.interface';

@Injectable()
export class ReportingService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async generateReport(tenantId: string, filters: ReportFilters): Promise<ReportData> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .where('transaction.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.merchantIds && filters.merchantIds.length > 0) {
      queryBuilder.andWhere('transaction.merchantId IN (:...merchantIds)', {
        merchantIds: filters.merchantIds,
      });
    }

    if (filters.paymentMethods && filters.paymentMethods.length > 0) {
      queryBuilder.andWhere('transaction.paymentMethod IN (:...paymentMethods)', {
        paymentMethods: filters.paymentMethods,
      });
    }

    if (filters.currencies && filters.currencies.length > 0) {
      queryBuilder.andWhere('transaction.currency IN (:...currencies)', {
        currencies: filters.currencies,
      });
    }

    if (filters.statuses && filters.statuses.length > 0) {
      queryBuilder.andWhere('transaction.status IN (:...statuses)', {
        statuses: filters.statuses,
      });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    }

    const transactions = await queryBuilder.getMany();

    // Calculate summary
    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalFees = transactions.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const successfulTransactions = transactions.filter(
      t => t.status === TransactionStatus.COMPLETED,
    ).length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

    // Calculate breakdowns
    const breakdown = {
      byStatus: this.calculateBreakdown(transactions, 'status'),
      byPaymentMethod: this.calculateBreakdown(transactions, 'paymentMethod'),
      byCurrency: this.calculateBreakdown(transactions, 'currency'),
      byCountry: this.calculateCountryBreakdown(transactions),
      byMerchant: this.calculateMerchantBreakdown(transactions),
    };

    // Generate time series
    const timeSeries = this.generateTimeSeries(transactions, filters.startDate, filters.endDate);

    // Calculate trends (comparing with previous period)
    const trends = await this.calculateTrends(tenantId, filters);

    return {
      summary: {
        totalTransactions,
        totalVolume: Math.round(totalVolume * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
      },
      breakdown,
      timeSeries,
      trends,
    };
  }

  private calculateBreakdown(transactions: Transaction[], field: keyof Transaction): Record<string, number> {
    return transactions.reduce((acc, transaction) => {
      const value = transaction[field] as string;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateCountryBreakdown(transactions: Transaction[]): Record<string, number> {
    return transactions.reduce((acc, transaction) => {
      // Extract country from customer details or simulate
      const country = transaction.customerDetails?.address?.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateMerchantBreakdown(transactions: Transaction[]): Record<string, { volume: number; count: number }> {
    return transactions.reduce((acc, transaction) => {
      const merchantId = transaction.merchantId;
      if (!acc[merchantId]) {
        acc[merchantId] = { volume: 0, count: 0 };
      }
      acc[merchantId].volume += Number(transaction.amount);
      acc[merchantId].count += 1;
      return acc;
    }, {} as Record<string, { volume: number; count: number }>);
  }

  private generateTimeSeries(
    transactions: Transaction[],
    startDate?: Date,
    endDate?: Date,
  ): TimeSeriesData[] {
    if (!startDate || !endDate) {
      return [];
    }

    const timeSeries: TimeSeriesData[] = [];
    const dayInMs = 24 * 60 * 60 * 1000;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate.getTime() + dayInMs);
      
      const dayTransactions = transactions.filter(t => 
        t.createdAt >= currentDate && t.createdAt < nextDate
      );

      const dayVolume = dayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

      timeSeries.push({
        timestamp: new Date(currentDate),
        value: Math.round(dayVolume * 100) / 100,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return timeSeries;
  }

  private async calculateTrends(tenantId: string, filters: ReportFilters) {
    if (!filters.startDate || !filters.endDate) {
      return {
        volumeTrend: 0,
        transactionTrend: 0,
        successRateTrend: 0,
      };
    }

    const periodLength = filters.endDate.getTime() - filters.startDate.getTime();
    const previousStartDate = new Date(filters.startDate.getTime() - periodLength);
    const previousEndDate = new Date(filters.startDate);

    // Get previous period data
    const previousTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: previousStartDate,
        endDate: previousEndDate,
      })
      .getMany();

    // Get current period data
    const currentTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      .getMany();

    const previousVolume = previousTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const currentVolume = currentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const volumeTrend = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0;

    const previousCount = previousTransactions.length;
    const currentCount = currentTransactions.length;
    const transactionTrend = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;

    const previousSuccessRate = previousCount > 0 
      ? (previousTransactions.filter(t => t.status === TransactionStatus.COMPLETED).length / previousCount) * 100 
      : 0;
    const currentSuccessRate = currentCount > 0 
      ? (currentTransactions.filter(t => t.status === TransactionStatus.COMPLETED).length / currentCount) * 100 
      : 0;
    const successRateTrend = previousSuccessRate > 0 
      ? ((currentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100 
      : 0;

    return {
      volumeTrend: Math.round(volumeTrend * 100) / 100,
      transactionTrend: Math.round(transactionTrend * 100) / 100,
      successRateTrend: Math.round(successRateTrend * 100) / 100,
    };
  }
}
