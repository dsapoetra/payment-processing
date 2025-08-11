import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

export interface EnvironmentLoggingConfig {
  level: string;
  enableConsole: boolean;
  enableFiles: boolean;
  enableStructuredLogging: boolean;
  enablePerformanceLogging: boolean;
  enableDebugLogging: boolean;
  transports: winston.transport[];
}

export class LoggingEnvironmentsConfig {
  /**
   * Development environment logging configuration
   */
  static getDevelopmentConfig(configService: ConfigService): EnvironmentLoggingConfig {
    const logDir = configService.get('LOG_DIR', 'logs');
    const appName = configService.get('APP_NAME', 'payment-processing');

    // Colorful console format for development
    const devConsoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, context, requestId, tenantId, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;

        if (context) {
          logMessage += ` [${context}]`;
        }

        if (requestId && typeof requestId === 'string') {
          logMessage += ` [req:${requestId.substring(0, 8)}]`;
        }

        if (tenantId && typeof tenantId === 'string') {
          logMessage += ` [tenant:${tenantId.substring(0, 8)}]`;
        }
        
        logMessage += ` ${message}`;
        
        // Pretty print metadata
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0) {
          const prettyMeta = JSON.stringify(meta, null, 2);
          logMessage += `\n${prettyMeta}`;
        }
        
        return logMessage;
      }),
    );

    const transports: winston.transport[] = [
      // Console with colors and pretty formatting
      new winston.transports.Console({
        level: 'debug',
        format: devConsoleFormat,
      }),
    ];

    // Optional file logging in development
    if (configService.get('LOG_FILES_IN_DEV', 'false') === 'true') {
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/dev-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '7d',
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    return {
      level: 'debug',
      enableConsole: true,
      enableFiles: configService.get('LOG_FILES_IN_DEV', 'false') === 'true',
      enableStructuredLogging: false,
      enablePerformanceLogging: true,
      enableDebugLogging: true,
      transports,
    };
  }

  /**
   * Staging environment logging configuration
   */
  static getStagingConfig(configService: ConfigService): EnvironmentLoggingConfig {
    const logDir = configService.get('LOG_DIR', 'logs');
    const appName = configService.get('APP_NAME', 'payment-processing');

    const structuredFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const transports: winston.transport[] = [
      // Console with structured logging
      new winston.transports.Console({
        level: 'info',
        format: structuredFormat,
      }),

      // Application logs
      new DailyRotateFile({
        filename: `${logDir}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: structuredFormat,
      }),

      // Error logs
      new DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: structuredFormat,
      }),

      // Performance logs
      new DailyRotateFile({
        filename: `${logDir}/performance-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '7d',
        level: 'info',
        format: structuredFormat,
      }),
    ];

    return {
      level: 'info',
      enableConsole: true,
      enableFiles: true,
      enableStructuredLogging: true,
      enablePerformanceLogging: true,
      enableDebugLogging: false,
      transports,
    };
  }

  /**
   * Production environment logging configuration
   */
  static getProductionConfig(configService: ConfigService): EnvironmentLoggingConfig {
    const logDir = configService.get('LOG_DIR', 'logs');
    const appName = configService.get('APP_NAME', 'payment-processing');

    const productionFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, requestId, tenantId, userId, ...meta }) => {
        const logEntry: any = {
          '@timestamp': timestamp,
          level: level.toUpperCase(),
          service: appName,
          environment: 'production',
          message,
          ...meta,
        };

        if (context) logEntry.context = context;
        if (requestId) logEntry.requestId = requestId;
        if (tenantId) logEntry.tenantId = tenantId;
        if (userId) logEntry.userId = userId;
        if (trace) logEntry.trace = trace;

        return JSON.stringify(logEntry);
      }),
    );

    const transports: winston.transport[] = [
      // Console logging (for container logs)
      new winston.transports.Console({
        level: configService.get('LOG_LEVEL', 'info'),
        format: productionFormat,
        silent: configService.get('LOG_CONSOLE', 'true') !== 'true',
      }),

      // Application logs
      new DailyRotateFile({
        filename: `${logDir}/app-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '30d',
        level: configService.get('LOG_LEVEL', 'info'),
        format: productionFormat,
      }),

      // Error logs
      new DailyRotateFile({
        filename: `${logDir}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '90d',
        level: 'error',
        format: productionFormat,
      }),

      // Transaction logs (for audit and compliance)
      new DailyRotateFile({
        filename: `${logDir}/transactions-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '100m',
        maxFiles: '7y', // 7 years for PCI compliance
        level: 'info',
        format: productionFormat,
      }),

      // Security logs
      new DailyRotateFile({
        filename: `${logDir}/security-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '7y', // 7 years for compliance
        level: 'warn',
        format: productionFormat,
      }),

      // Performance logs
      new DailyRotateFile({
        filename: `${logDir}/performance-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '30d',
        level: 'info',
        format: productionFormat,
      }),
    ];

    return {
      level: configService.get('LOG_LEVEL', 'info'),
      enableConsole: configService.get('LOG_CONSOLE', 'true') === 'true',
      enableFiles: true,
      enableStructuredLogging: true,
      enablePerformanceLogging: configService.get('ENABLE_PERFORMANCE_LOGGING', 'true') === 'true',
      enableDebugLogging: false,
      transports,
    };
  }

  /**
   * Test environment logging configuration
   */
  static getTestConfig(configService: ConfigService): EnvironmentLoggingConfig {
    const transports: winston.transport[] = [
      // Minimal console logging for tests
      new winston.transports.Console({
        level: 'error',
        format: winston.format.simple(),
        silent: configService.get('LOG_SILENT_IN_TESTS', 'true') === 'true',
      }),
    ];

    return {
      level: 'error',
      enableConsole: configService.get('LOG_SILENT_IN_TESTS', 'true') !== 'true',
      enableFiles: false,
      enableStructuredLogging: false,
      enablePerformanceLogging: false,
      enableDebugLogging: false,
      transports,
    };
  }

  /**
   * Serverless environment logging configuration (Vercel, AWS Lambda, etc.)
   */
  static getServerlessConfig(configService: ConfigService): EnvironmentLoggingConfig {
    const structuredFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const transports: winston.transport[] = [
      // Console only - no file system access in serverless
      new winston.transports.Console({
        level: configService.get('LOG_LEVEL', 'info'),
        format: structuredFormat,
      }),
    ];

    return {
      level: configService.get('LOG_LEVEL', 'info'),
      enableConsole: true,
      enableFiles: false, // No file system access
      enableStructuredLogging: true,
      enablePerformanceLogging: true,
      enableDebugLogging: false,
      transports,
    };
  }

  /**
   * Get configuration based on environment
   */
  static getConfigForEnvironment(configService: ConfigService): EnvironmentLoggingConfig {
    const environment = configService.get('NODE_ENV', 'development');
    const isServerless = configService.get('VERCEL', 'false') === '1' ||
                        configService.get('AWS_LAMBDA_FUNCTION_NAME') ||
                        configService.get('SERVERLESS', 'false') === 'true';

    // Check for serverless environment first
    if (isServerless) {
      return this.getServerlessConfig(configService);
    }

    switch (environment) {
      case 'production':
        return this.getProductionConfig(configService);
      case 'staging':
        return this.getStagingConfig(configService);
      case 'test':
        return this.getTestConfig(configService);
      case 'development':
      default:
        return this.getDevelopmentConfig(configService);
    }
  }
}
