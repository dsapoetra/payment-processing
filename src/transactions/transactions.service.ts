import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionProcessorService } from './services/transaction-processor.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly transactionProcessor: TransactionProcessorService,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    tenantId: string,
    userId?: string,
  ): Promise<Transaction> {
    return await this.transactionProcessor.processTransaction(
      createTransactionDto,
      tenantId,
      userId,
    );
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: TransactionStatus;
      merchantId?: string;
      paymentMethod?: string;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      customerEmail?: string;
    },
    page = 1,
    limit = 50,
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.merchant', 'merchant')
      .where('transaction.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: filters.status });
    }

    if (filters?.merchantId) {
      queryBuilder.andWhere('transaction.merchantId = :merchantId', {
        merchantId: filters.merchantId,
      });
    }

    if (filters?.paymentMethod) {
      queryBuilder.andWhere('transaction.paymentMethod = :paymentMethod', {
        paymentMethod: filters.paymentMethod,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.minAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', {
        minAmount: filters.minAmount,
      });
    }

    if (filters?.maxAmount !== undefined) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', {
        maxAmount: filters.maxAmount,
      });
    }

    if (filters?.customerEmail) {
      queryBuilder.andWhere('transaction.customerEmail = :customerEmail', {
        customerEmail: filters.customerEmail,
      });
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findOne(id: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, tenantId },
      relations: ['merchant'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async findByTransactionId(transactionId: string, tenantId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionId, tenantId },
      relations: ['merchant'],
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    tenantId: string,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, tenantId);

    // Only allow certain fields to be updated
    const allowedUpdates = ['description', 'metadata', 'status', 'failureCode', 'failureReason'];
    const updates = Object.keys(updateTransactionDto).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = updateTransactionDto[key];
      }
      return acc;
    }, {});

    Object.assign(transaction, updates);
    return await this.transactionRepository.save(transaction);
  }

  async refund(
    transactionId: string,
    amount: number,
    reason: string,
    tenantId: string,
    userId?: string,
  ): Promise<Transaction> {
    return await this.transactionProcessor.refundTransaction(
      transactionId,
      amount,
      reason,
      tenantId,
      userId,
    );
  }

  async cancel(id: string, tenantId: string, reason?: string): Promise<Transaction> {
    const transaction = await this.findOne(id, tenantId);

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending transactions');
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.failureReason = reason || 'Transaction cancelled by user';
    transaction.processedAt = new Date();

    return await this.transactionRepository.save(transaction);
  }

  async getTransactionStats(
    tenantId: string,
    merchantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    totalFees: number;
    successRate: number;
    averageAmount: number;
    statusBreakdown: Record<string, number>;
    paymentMethodBreakdown: Record<string, number>;
  }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId });

    if (merchantId) {
      queryBuilder.andWhere('transaction.merchantId = :merchantId', { merchantId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const transactions = await queryBuilder.getMany();

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalFees = transactions.reduce((sum, t) => sum + Number(t.feeAmount), 0);
    const successfulTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.COMPLETED,
    ).length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Status breakdown
    const statusBreakdown = transactions.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Payment method breakdown
    const paymentMethodBreakdown = transactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTransactions,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      successRate: Math.round(successRate * 100) / 100,
      averageAmount: Math.round(averageAmount * 100) / 100,
      statusBreakdown,
      paymentMethodBreakdown,
    };
  }
}
