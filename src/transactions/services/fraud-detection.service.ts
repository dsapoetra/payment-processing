import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { AppLoggerService } from '../../common/services/logger.service';

export interface RiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: string[];
  fraudProbability: number;
  recommendation: 'approve' | 'review' | 'decline';
}

@Injectable()
export class FraudDetectionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly logger: AppLoggerService,
  ) {}

  async assessRisk(
    transactionDto: CreateTransactionDto,
    tenantId: string,
  ): Promise<RiskAssessment> {
    const startTime = Date.now();
    const factors: string[] = [];
    let score = 0;

    this.logger.debug(
      'Starting fraud risk assessment',
      'FraudDetection',
      {
        tenantId,
        merchantId: transactionDto.merchantId,
        amount: transactionDto.amount,
        paymentMethod: transactionDto.paymentMethod
      }
    );

    // Amount-based risk factors
    if (transactionDto.amount > 10000) {
      factors.push('HIGH_AMOUNT');
      score += 30;
      this.logger.debug('High amount risk factor applied', 'FraudDetection', { amount: transactionDto.amount, scoreAdded: 30 });
    } else if (transactionDto.amount > 1000) {
      factors.push('MEDIUM_AMOUNT');
      score += 10;
      this.logger.debug('Medium amount risk factor applied', 'FraudDetection', { amount: transactionDto.amount, scoreAdded: 10 });
    }

    // Velocity checks
    if (transactionDto.customerEmail) {
      const velocityRisk = await this.checkVelocity(
        transactionDto.customerEmail,
        transactionDto.merchantId,
        tenantId,
      );
      score += velocityRisk.score;
      factors.push(...velocityRisk.factors);
    }
    // Payment method risk
    const paymentMethodRisk = this.assessPaymentMethodRisk(transactionDto.paymentMethod);
    score += paymentMethodRisk.score;
    factors.push(...paymentMethodRisk.factors);

    // Geographic risk (simulated)
    if (transactionDto.ipAddress) {
      const geoRisk = this.assessGeographicRisk(transactionDto.ipAddress);
      score += geoRisk.score;
      factors.push(...geoRisk.factors);
    }

    // Customer history risk
    if (transactionDto.customerEmail) {
      const historyRisk = await this.assessCustomerHistory(
        transactionDto.customerEmail,
        tenantId,
      );
      score += historyRisk.score;
      factors.push(...historyRisk.factors);
    }

    // Time-based risk
    const timeRisk = this.assessTimeRisk();
    score += timeRisk.score;
    factors.push(...timeRisk.factors);

    // Determine risk level and recommendation
    let level: 'low' | 'medium' | 'high';
    let recommendation: 'approve' | 'review' | 'decline';

    if (score <= 20) {
      level = 'low';
      recommendation = 'approve';
    } else if (score <= 50) {
      level = 'medium';
      recommendation = 'review';
    } else {
      level = 'high';
      recommendation = 'decline';
    }

    const fraudProbability = Math.min(score / 100, 0.95);
    const assessmentTime = Date.now() - startTime;

    const riskAssessment = {
      score,
      level,
      factors,
      fraudProbability,
      recommendation,
    };

    this.logger.logFraudDetection(
      `Risk assessment completed: ${level} risk (${score} points)`,
      score,
      factors,
      'pending', // Transaction ID not available at this point
      {
        tenantId,
        merchantId: transactionDto.merchantId,
        amount: transactionDto.amount,
        paymentMethod: transactionDto.paymentMethod,
        riskLevel: level,
        recommendation,
        fraudProbability,
        assessmentTime,
        factorsCount: factors.length
      }
    );

    return riskAssessment;
  }

  private async checkVelocity(
    customerEmail: string,
    merchantId: string,
    tenantId: string,
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    if (!customerEmail) {
      return { score, factors };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check transactions in the last hour
    const recentTransactions = await this.transactionRepository.count({
      where: {
        customerEmail,
        tenantId,
        createdAt: MoreThanOrEqual(oneHourAgo),
      },
    });

    if (recentTransactions > 5) {
      factors.push('HIGH_VELOCITY_HOUR');
      score += 25;
    } else if (recentTransactions > 2) {
      factors.push('MEDIUM_VELOCITY_HOUR');
      score += 10;
    }

    // Check transactions in the last day
    const dailyTransactions = await this.transactionRepository.count({
      where: {
        customerEmail,
        tenantId,
        createdAt: MoreThanOrEqual(oneDayAgo),
      },
    });

    if (dailyTransactions > 20) {
      factors.push('HIGH_VELOCITY_DAY');
      score += 20;
    } else if (dailyTransactions > 10) {
      factors.push('MEDIUM_VELOCITY_DAY');
      score += 8;
    }

    return { score, factors };
  }

  private assessPaymentMethodRisk(paymentMethod: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    switch (paymentMethod) {
      case 'cryptocurrency':
        factors.push('HIGH_RISK_PAYMENT_METHOD');
        score += 20;
        break;
      case 'bank_transfer':
        factors.push('LOW_RISK_PAYMENT_METHOD');
        score += 2;
        break;
      case 'digital_wallet':
        factors.push('MEDIUM_RISK_PAYMENT_METHOD');
        score += 5;
        break;
      default:
        score += 3;
    }

    return { score, factors };
  }

  private assessGeographicRisk(ipAddress: string): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Simulate geographic risk assessment
    // In a real implementation, you would use IP geolocation services
    const isHighRiskCountry = Math.random() < 0.1; // 10% chance
    const isVPN = Math.random() < 0.05; // 5% chance

    if (isHighRiskCountry) {
      factors.push('HIGH_RISK_COUNTRY');
      score += 15;
    }

    if (isVPN) {
      factors.push('VPN_DETECTED');
      score += 10;
    }

    return { score, factors };
  }

  private async assessCustomerHistory(
    customerEmail: string,
    tenantId: string,
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    if (!customerEmail) {
      factors.push('NO_CUSTOMER_EMAIL');
      score += 5;
      return { score, factors };
    }

    // Check for failed transactions
    const failedTransactions = await this.transactionRepository.count({
      where: {
        customerEmail,
        tenantId,
        status: TransactionStatus.FAILED,
      },
    });

    if (failedTransactions > 3) {
      factors.push('HIGH_FAILURE_RATE');
      score += 15;
    } else if (failedTransactions > 1) {
      factors.push('MEDIUM_FAILURE_RATE');
      score += 5;
    }

    // Check for chargebacks
    const chargebacks = await this.transactionRepository.count({
      where: {
        customerEmail,
        tenantId,
        type: TransactionType.CHARGEBACK,
      },
    });

    if (chargebacks > 0) {
      factors.push('CHARGEBACK_HISTORY');
      score += 25;
    }

    // Check if new customer
    const totalTransactions = await this.transactionRepository.count({
      where: {
        customerEmail,
        tenantId,
      },
    });

    if (totalTransactions === 0) {
      factors.push('NEW_CUSTOMER');
      score += 8;
    }

    return { score, factors };
  }

  private assessTimeRisk(): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    const now = new Date();
    const hour = now.getHours();

    // Higher risk during unusual hours
    if (hour < 6 || hour > 22) {
      factors.push('UNUSUAL_HOUR');
      score += 5;
    }

    // Weekend risk
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      factors.push('WEEKEND_TRANSACTION');
      score += 3;
    }

    return { score, factors };
  }
}
