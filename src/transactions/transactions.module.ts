import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionProcessorService } from './services/transaction-processor.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { AuditModule } from '../audit/audit.module';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AuditModule,
    MerchantsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionProcessorService,
    FraudDetectionService,
  ],
  exports: [TransactionsService, TransactionProcessorService],
})
export class TransactionsModule {}
