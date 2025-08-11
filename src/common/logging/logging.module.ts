import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerConfigService } from '../config/logger.config';
import { AppLoggerService } from '../services/logger.service';
import { DatabaseLoggerService } from '../services/database-logger.service';
import { HealthMonitorService } from '../services/health-monitor.service';
import { LogCleanupService } from '../services/log-cleanup.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return LoggerConfigService.createWinstonOptions(configService);
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AppLoggerService,
    DatabaseLoggerService,
    HealthMonitorService,
    LogCleanupService,
  ],
  exports: [
    AppLoggerService,
    DatabaseLoggerService,
    HealthMonitorService,
    LogCleanupService,
  ],
})
export class LoggingModule {}
