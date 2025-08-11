import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RealtimeAnalyticsService } from './services/realtime-analytics.service';
import { KpiService } from './services/kpi.service';
import { ReportingService } from './services/reporting.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Merchant, User]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    RealtimeAnalyticsService,
    KpiService,
    ReportingService,
  ],
  exports: [AnalyticsService, RealtimeAnalyticsService, KpiService],
})
export class AnalyticsModule {}
