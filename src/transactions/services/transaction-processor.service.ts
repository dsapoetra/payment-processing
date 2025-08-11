import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { FraudDetectionService, RiskAssessment } from './fraud-detection.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { AppLoggerService } from '../../common/services/logger.service';

@Injectable()
export class TransactionProcessorService implements OnModuleInit {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly fraudDetectionService: FraudDetectionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async onModuleInit() {
    // Recover stuck refunds on startup
    await this.recoverStuckRefunds();
  }

  async processTransaction(
    createTransactionDto: CreateTransactionDto,
    tenantId: string,
    userId?: string,
  ): Promise<Transaction> {
    const startTime = Date.now();
    const logContext = { tenantId, userId };

    this.logger.logTransaction(
      'Starting transaction processing',
      {
        transactionId: 'pending',
        merchantId: createTransactionDto.merchantId,
        amount: createTransactionDto.amount,
        currency: createTransactionDto.currency,
        paymentMethod: createTransactionDto.paymentMethod,
        status: 'processing',
      },
      logContext
    );

    try {
      // Validate merchant
      const merchant = await this.merchantRepository.findOne({
        where: { id: createTransactionDto.merchantId, tenantId },
      });

      if (!merchant) {
        this.logger.logTransactionError(
          'Merchant not found during transaction processing',
          new NotFoundException('Merchant not found'),
          { merchantId: createTransactionDto.merchantId },
          logContext
        );
        throw new NotFoundException('Merchant not found');
      }

      if (merchant.status !== 'active') {
        this.logger.logTransactionError(
          'Inactive merchant attempted transaction',
          new BadRequestException('Merchant is not active'),
          {
            merchantId: createTransactionDto.merchantId,
          },
          { ...logContext, merchantStatus: merchant.status }
        );
        throw new BadRequestException('Merchant is not active');
      }

      this.logger.debug(
        `Merchant validation successful for merchant ${merchant.id}`,
        'TransactionProcessor',
        { ...logContext, merchantId: merchant.id }
      );

      // Generate transaction ID
      const transactionId = this.generateTransactionId();

      // Calculate fees
      const feeAmount = this.calculateFees(createTransactionDto.amount, createTransactionDto.paymentMethod);
      const netAmount = createTransactionDto.amount - feeAmount;

      this.logger.debug(
        `Transaction fees calculated: ${feeAmount} ${createTransactionDto.currency}`,
        'TransactionProcessor',
        {
          ...logContext,
          transactionId,
          amount: createTransactionDto.amount,
          feeAmount,
          netAmount,
          paymentMethod: createTransactionDto.paymentMethod
        }
      );

      // Create transaction
      const transaction = this.transactionRepository.create({
        ...createTransactionDto,
        transactionId,
        feeAmount,
        netAmount,
        tenantId,
        status: TransactionStatus.PENDING,
        createdBy: userId,
      });

      // Perform fraud detection
      this.logger.debug(
        'Starting fraud detection assessment',
        'TransactionProcessor',
        { ...logContext, transactionId }
      );

      const riskAssessment = await this.fraudDetectionService.assessRisk(
        createTransactionDto,
        tenantId,
      );

      this.logger.logFraudDetection(
        `Fraud assessment completed for transaction ${transactionId}`,
        riskAssessment.score,
        riskAssessment.factors,
        transactionId,
        {
          ...logContext,
          riskLevel: riskAssessment.level,
          recommendation: riskAssessment.recommendation,
          fraudProbability: riskAssessment.fraudProbability
        }
      );

      transaction.riskAssessment = riskAssessment;

      // Save transaction
      const savedTransaction = await this.transactionRepository.save(transaction);

      this.logger.logTransaction(
        `Transaction ${transactionId} created successfully`,
        {
          transactionId,
          merchantId: createTransactionDto.merchantId,
          amount: createTransactionDto.amount,
          currency: createTransactionDto.currency,
          paymentMethod: createTransactionDto.paymentMethod,
          status: TransactionStatus.PENDING,
          riskScore: riskAssessment.score,
        },
        logContext
      );

      // Log audit event
      await this.auditService.log({
        action: AuditAction.CREATE,
        entityType: 'Transaction',
        entityId: savedTransaction.id,
        description: `Transaction ${transactionId} created`,
        tenantId,
        userId,
        metadata: {
          amount: createTransactionDto.amount,
          paymentMethod: createTransactionDto.paymentMethod,
          riskScore: riskAssessment.score,
        },
      });

      // Process based on risk assessment
      await this.processBasedOnRisk(savedTransaction, riskAssessment, tenantId, userId);

      const result = await this.transactionRepository.findOne({
        where: { id: savedTransaction.id },
        relations: ['merchant'],
      });

      if (!result) {
        this.logger.error(
          `Transaction not found after creation: ${transactionId}`,
          undefined,
          'TransactionProcessor',
          { ...logContext, transactionId }
        );
        throw new NotFoundException('Transaction not found after creation');
      }

      const processingTime = Date.now() - startTime;
      this.logger.logTransaction(
        `Transaction processing completed for ${transactionId}`,
        {
          transactionId,
          merchantId: createTransactionDto.merchantId,
          amount: createTransactionDto.amount,
          currency: createTransactionDto.currency,
          paymentMethod: createTransactionDto.paymentMethod,
          status: result.status,
          riskScore: riskAssessment.score,
          processingTime,
        },
        logContext
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.logTransactionError(
        `Transaction processing failed: ${error.message}`,
        error,
        {
          merchantId: createTransactionDto.merchantId,
          amount: createTransactionDto.amount,
          currency: createTransactionDto.currency,
          paymentMethod: createTransactionDto.paymentMethod,
          processingTime,
        },
        logContext
      );
      throw error;
    }
  }

  async refundTransaction(
    transactionId: string,
    amount: number,
    reason: string,
    tenantId: string,
    userId?: string,
  ): Promise<Transaction> {
    const originalTransaction = await this.transactionRepository.findOne({
      where: { transactionId, tenantId },
    });

    if (!originalTransaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (originalTransaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed transactions');
    }

    if (amount > originalTransaction.amount) {
      throw new BadRequestException('Refund amount cannot exceed original amount');
    }

    const refundTransactionId = this.generateTransactionId();
    const isPartialRefund = amount < originalTransaction.amount;

    // Create refund transaction
    const refundTransaction = this.transactionRepository.create({
      transactionId: refundTransactionId,
      type: TransactionType.REFUND,
      status: TransactionStatus.PROCESSING,
      paymentMethod: originalTransaction.paymentMethod,
      amount: amount,
      currency: originalTransaction.currency,
      feeAmount: 0, // No fees on refunds
      netAmount: amount,
      description: `Refund for ${originalTransaction.transactionId}: ${reason}`,
      customerEmail: originalTransaction.customerEmail,
      customerPhone: originalTransaction.customerPhone,
      merchantId: originalTransaction.merchantId,
      tenantId,
      parentTransactionId: originalTransaction.transactionId,
      createdBy: userId,
    });

    const savedRefund: Transaction = await this.transactionRepository.save(refundTransaction);

    // Update original transaction status
    originalTransaction.status = isPartialRefund 
      ? TransactionStatus.PARTIALLY_REFUNDED 
      : TransactionStatus.REFUNDED;
    
    await this.transactionRepository.save(originalTransaction);

    // Simulate refund processing
    setTimeout(async () => {
      try {
        console.log(`Completing refund ${savedRefund.transactionId} after 2 second delay`);
        await this.completeRefund(savedRefund.id, tenantId, userId);
        console.log(`Refund ${savedRefund.transactionId} completed successfully`);
      } catch (error) {
        console.error(`Error completing refund ${savedRefund.transactionId}:`, error);
      }
    }, 2000);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: 'Transaction',
      entityId: savedRefund.id,
      description: `Refund ${refundTransactionId} created for transaction ${originalTransaction.transactionId}`,
      tenantId,
      userId,
      metadata: {
        originalTransactionId: originalTransaction.transactionId,
        refundAmount: amount,
        reason,
        isPartialRefund,
      },
    });

    return savedRefund;
  }

  private async processBasedOnRisk(
    transaction: Transaction,
    riskAssessment: RiskAssessment,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    switch (riskAssessment.recommendation) {
      case 'approve':
        // Auto-approve low-risk transactions
        setTimeout(async () => {
          await this.completeTransaction(transaction.id, tenantId, userId);
        }, 1000);
        break;

      case 'review':
        // Mark for manual review
        transaction.status = TransactionStatus.PROCESSING;
        await this.transactionRepository.save(transaction);
        
        await this.auditService.log({
          action: AuditAction.UPDATE,
          entityType: 'Transaction',
          entityId: transaction.id,
          description: `Transaction ${transaction.transactionId} marked for manual review`,
          tenantId,
          userId,
          metadata: { riskScore: riskAssessment.score },
        });
        break;

      case 'decline':
        // Auto-decline high-risk transactions
        await this.failTransaction(
          transaction.id,
          'FRAUD_SUSPECTED',
          'Transaction declined due to high fraud risk',
          tenantId,
          userId,
        );
        break;
    }
  }

  private async completeTransaction(
    transactionId: string,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, tenantId },
    });

    if (transaction) {
      transaction.status = TransactionStatus.COMPLETED;
      transaction.processedAt = new Date();
      transaction.settledAt = new Date();
      
      await this.transactionRepository.save(transaction);

      await this.auditService.log({
        action: AuditAction.UPDATE,
        entityType: 'Transaction',
        entityId: transaction.id,
        description: `Transaction ${transaction.transactionId} completed`,
        tenantId,
        userId,
      });
    }
  }

  private async completeRefund(
    refundId: string,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    const refund = await this.transactionRepository.findOne({
      where: { id: refundId, tenantId },
    });

    if (refund) {
      refund.status = TransactionStatus.COMPLETED;
      refund.processedAt = new Date();
      refund.settledAt = new Date();
      
      await this.transactionRepository.save(refund);

      await this.auditService.log({
        action: AuditAction.UPDATE,
        entityType: 'Transaction',
        entityId: refund.id,
        description: `Refund ${refund.transactionId} completed`,
        tenantId,
        userId,
      });
    }
  }

  private async failTransaction(
    transactionId: string,
    failureCode: string,
    failureReason: string,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, tenantId },
    });

    if (transaction) {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureCode = failureCode;
      transaction.failureReason = failureReason;
      transaction.processedAt = new Date();

      await this.transactionRepository.save(transaction);

      await this.auditService.log({
        action: AuditAction.UPDATE,
        entityType: 'Transaction',
        entityId: transaction.id,
        description: `Transaction ${transaction.transactionId} failed: ${failureReason}`,
        tenantId,
        userId,
        metadata: { failureCode, failureReason },
      });
    }
  }

  private async recoverStuckRefunds(): Promise<void> {
    try {
      console.log('Checking for stuck refunds on startup...');

      // Find refunds that are stuck in processing status for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const stuckRefunds = await this.transactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.type = :type', { type: TransactionType.REFUND })
        .andWhere('transaction.status = :status', { status: TransactionStatus.PROCESSING })
        .andWhere('transaction.createdAt < :fiveMinutesAgo', { fiveMinutesAgo })
        .getMany();

      console.log(`Found ${stuckRefunds.length} stuck refunds to recover`);

      for (const refund of stuckRefunds) {
        console.log(`Recovering stuck refund: ${refund.transactionId}`);
        await this.completeRefund(refund.id, refund.tenantId, refund.createdBy);
      }

      if (stuckRefunds.length > 0) {
        console.log(`Successfully recovered ${stuckRefunds.length} stuck refunds`);
      }
    } catch (error) {
      console.error('Error recovering stuck refunds:', error);
    }
  }

  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  private calculateFees(amount: number, paymentMethod: string): number {
    // Simulate different fee structures based on payment method
    const feeRates = {
      credit_card: 0.029, // 2.9%
      debit_card: 0.015,  // 1.5%
      bank_transfer: 0.005, // 0.5%
      digital_wallet: 0.025, // 2.5%
      cryptocurrency: 0.01, // 1.0%
    };

    const rate = feeRates[paymentMethod] || 0.025;
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }
}
