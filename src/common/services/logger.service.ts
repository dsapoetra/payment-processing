import { Injectable, Inject, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export interface TransactionLogData {
  transactionId: string;
  merchantId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  riskScore?: number;
  processingTime?: number;
  failureCode?: string;
  failureReason?: string;
}

export interface SecurityLogData {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceLogData {
  operation: string;
  duration: number;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  memoryDelta?: any;
  cpuUsage?: NodeJS.CpuUsage;
}

@Injectable()
export class AppLoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Standard logging methods
   */
  log(message: string, context?: string, meta?: LogContext) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: LogContext) {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: LogContext) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: LogContext) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: LogContext) {
    this.logger.verbose(message, { context, ...meta });
  }

  /**
   * Transaction-specific logging
   */
  logTransaction(message: string, data: TransactionLogData, context?: LogContext) {
    this.logger.info(message, {
      context: 'TransactionProcessor',
      category: 'transaction',
      ...data,
      ...context,
    });
  }

  logTransactionError(message: string, error: Error, data: Partial<TransactionLogData>, context?: LogContext) {
    this.logger.error(message, {
      context: 'TransactionProcessor',
      category: 'transaction_error',
      error: error.message,
      stack: error.stack,
      ...data,
      ...context,
    });
  }

  logTransactionSuccess(message: string, data: TransactionLogData, context?: LogContext) {
    this.logger.info(message, {
      context: 'TransactionProcessor',
      category: 'transaction_success',
      ...data,
      ...context,
    });
  }

  /**
   * Security-specific logging
   */
  logSecurityEvent(message: string, data: SecurityLogData, context?: LogContext) {
    this.logger.warn(message, {
      context: 'SecurityAudit',
      category: 'security_event',
      ...data,
      ...context,
    });
  }

  logAuthenticationEvent(message: string, success: boolean, userId?: string, context?: LogContext) {
    const level = success ? 'info' : 'warn';
    this.logger[level](message, {
      context: 'Authentication',
      category: 'auth_event',
      success,
      userId,
      ...context,
    });
  }

  logAuthorizationFailure(message: string, userId?: string, resource?: string, context?: LogContext) {
    this.logger.warn(message, {
      context: 'Authorization',
      category: 'auth_failure',
      userId,
      resource,
      ...context,
    });
  }

  /**
   * Performance logging
   */
  logPerformance(message: string, data: PerformanceLogData, context?: LogContext) {
    this.logger.info(message, {
      context: 'Performance',
      category: 'performance',
      ...data,
      ...context,
    });
  }

  logSlowQuery(message: string, query: string, duration: number, context?: LogContext) {
    this.logger.warn(message, {
      context: 'Database',
      category: 'slow_query',
      query: this.sanitizeQuery(query),
      duration,
      ...context,
    });
  }

  /**
   * API request/response logging
   */
  logRequest(message: string, method: string, url: string, statusCode: number, duration: number, context?: LogContext) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](message, {
      context: 'HTTP',
      category: 'api_request',
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration,
      ...context,
    });
  }

  logApiError(message: string, error: Error, method: string, url: string, context?: LogContext) {
    this.logger.error(message, {
      context: 'HTTP',
      category: 'api_error',
      method,
      url: this.sanitizeUrl(url),
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }

  /**
   * Business logic logging
   */
  logBusinessEvent(message: string, eventType: string, entityType: string, entityId?: string, context?: LogContext) {
    this.logger.info(message, {
      context: 'Business',
      category: 'business_event',
      eventType,
      entityType,
      entityId,
      ...context,
    });
  }

  logFraudDetection(message: string, riskScore: number, factors: string[], transactionId: string, context?: LogContext) {
    this.logger.info(message, {
      context: 'FraudDetection',
      category: 'fraud_assessment',
      riskScore,
      factors,
      transactionId,
      ...context,
    });
  }

  /**
   * System logging
   */
  logSystemEvent(message: string, eventType: string, metadata?: Record<string, any>, context?: LogContext) {
    this.logger.info(message, {
      context: 'System',
      category: 'system_event',
      eventType,
      ...metadata,
      ...context,
    });
  }

  logHealthCheck(message: string, service: string, status: 'healthy' | 'unhealthy', details?: any, context?: LogContext) {
    const level = status === 'healthy' ? 'info' : 'error';
    this.logger[level](message, {
      context: 'HealthCheck',
      category: 'health_check',
      service,
      status,
      details,
      ...context,
    });
  }

  /**
   * Utility methods
   */
  private sanitizeUrl(url: string): string {
    // Remove sensitive parameters from URL
    return url.replace(/([?&])(password|token|key|secret)=[^&]*/gi, '$1$2=***');
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from SQL queries
    return query.replace(/(password|token|key|secret)\s*=\s*'[^']*'/gi, '$1=***');
  }

  /**
   * Create child logger with context
   */
  child(context: LogContext): AppLoggerService {
    const childLogger = this.logger.child(context);
    return new AppLoggerService(childLogger as Logger);
  }
}
