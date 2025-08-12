import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './tenants/tenants.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MerchantsModule } from './merchants/merchants.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { HealthModule } from './health/health.module';
import { UiModule } from './ui/ui.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { AdminAuthMiddleware } from './middleware/admin-auth.middleware';
import { LoggingModule } from './common/logging/logging.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Logging
    LoggingModule,

    // Static file serving handled by UiController

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get('RATE_LIMIT_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    TenantsModule,
    AuthModule,
    UsersModule,
    MerchantsModule,
    TransactionsModule,
    AuditModule,
    AnalyticsModule,
    SecurityModule,
    HealthModule,
    UiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes('*');

    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');

    // TODO: Add admin authentication middleware later
    // consumer
    //   .apply(AdminAuthMiddleware)
    //   .forRoutes('*');
  }
}
