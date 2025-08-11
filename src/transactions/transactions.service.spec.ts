import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { TransactionProcessorService } from './services/transaction-processor.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: Repository<Transaction>;
  let processor: TransactionProcessorService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockProcessor = {
    processTransaction: jest.fn(),
    refundTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockRepository,
        },
        {
          provide: TransactionProcessorService,
          useValue: mockProcessor,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    processor = module.get<TransactionProcessorService>(TransactionProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction successfully', async () => {
      const createTransactionDto: CreateTransactionDto = {
        type: 'payment',
        paymentMethod: 'credit_card',
        amount: 100.00,
        currency: 'USD',
        merchantId: 'merchant-123',
        description: 'Test payment',
      };

      const expectedTransaction = {
        id: 'transaction-123',
        transactionId: 'TXN_123',
        ...createTransactionDto,
        status: TransactionStatus.PENDING,
        tenantId: 'tenant-123',
      };

      mockProcessor.processTransaction.mockResolvedValue(expectedTransaction);

      const result = await service.create(createTransactionDto, 'tenant-123', 'user-123');

      expect(mockProcessor.processTransaction).toHaveBeenCalledWith(
        createTransactionDto,
        'tenant-123',
        'user-123',
      );
      expect(result).toEqual(expectedTransaction);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          transactionId: 'TXN_001',
          amount: 100,
          status: TransactionStatus.COMPLETED,
        },
        {
          id: 'transaction-2',
          transactionId: 'TXN_002',
          amount: 200,
          status: TransactionStatus.PENDING,
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll('tenant-123', {}, 1, 10);

      expect(result).toEqual({
        data: mockTransactions,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'transaction.tenantId = :tenantId',
        { tenantId: 'tenant-123' },
      );
    });

    it('should apply filters correctly', async () => {
      const filters = {
        status: TransactionStatus.COMPLETED,
        merchantId: 'merchant-123',
        minAmount: 50,
        maxAmount: 500,
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('tenant-123', filters, 1, 10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.status = :status',
        { status: filters.status },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.merchantId = :merchantId',
        { merchantId: filters.merchantId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.amount >= :minAmount',
        { minAmount: filters.minAmount },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'transaction.amount <= :maxAmount',
        { maxAmount: filters.maxAmount },
      );
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        transactionId: 'TXN_123',
        tenantId: 'tenant-123',
      };

      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.findOne('transaction-123', 'tenant-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'transaction-123', tenantId: 'tenant-123' },
        relations: ['merchant'],
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'tenant-123')).rejects.toThrow(
        'Transaction not found',
      );
    });
  });

  describe('refund', () => {
    it('should process a refund successfully', async () => {
      const expectedRefund = {
        id: 'refund-123',
        transactionId: 'TXN_REFUND_123',
        type: 'refund',
        amount: 50,
        status: TransactionStatus.PROCESSING,
      };

      mockProcessor.refundTransaction.mockResolvedValue(expectedRefund);

      const result = await service.refund(
        'TXN_123',
        50,
        'Customer request',
        'tenant-123',
        'user-123',
      );

      expect(mockProcessor.refundTransaction).toHaveBeenCalledWith(
        'TXN_123',
        50,
        'Customer request',
        'tenant-123',
        'user-123',
      );
      expect(result).toEqual(expectedRefund);
    });
  });

  describe('getTransactionStats', () => {
    it('should calculate transaction statistics correctly', async () => {
      const mockTransactions = [
        {
          amount: 100,
          feeAmount: 3,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'credit_card',
        },
        {
          amount: 200,
          feeAmount: 6,
          status: TransactionStatus.COMPLETED,
          paymentMethod: 'debit_card',
        },
        {
          amount: 150,
          feeAmount: 4.5,
          status: TransactionStatus.FAILED,
          paymentMethod: 'credit_card',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTransactions),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactionStats('tenant-123');

      expect(result).toEqual({
        totalTransactions: 3,
        totalAmount: 450,
        totalFees: 13.5,
        successRate: 66.67,
        averageAmount: 150,
        statusBreakdown: {
          completed: 2,
          failed: 1,
        },
        paymentMethodBreakdown: {
          credit_card: 2,
          debit_card: 1,
        },
      });
    });
  });
});
