import { WinstonModuleOptions } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { LoggingEnvironmentsConfig } from './logging-environments.config';

export interface LoggerConfig {
  level: string;
  format: winston.Logform.Format;
  transports: winston.transport[];
  exitOnError: boolean;
}

export class LoggerConfigService {
  static createWinstonOptions(configService: ConfigService): WinstonModuleOptions {
    const environment = configService.get('NODE_ENV', 'development');

    // Get environment-specific configuration
    const envConfig = LoggingEnvironmentsConfig.getConfigForEnvironment(configService);

    // Use environment-specific transports or fall back to legacy configuration
    if (envConfig.transports.length > 0) {
      return {
        level: envConfig.level,
        format: winston.format.json(),
        transports: envConfig.transports,
        exitOnError: false,
        handleExceptions: environment !== 'production',
        handleRejections: environment !== 'production',
      };
    }

    // Legacy configuration (fallback)
    const logLevel = configService.get('LOG_LEVEL', environment === 'production' ? 'info' : 'debug');
    const logDir = configService.get('LOG_DIR', 'logs');
    const appName = configService.get('APP_NAME', 'payment-processing');

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, requestId, tenantId, userId, ...meta }) => {
        const logEntry: any = {
          timestamp,
          level: level.toUpperCase(),
          service: appName,
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

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS',
      }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, context, requestId, tenantId, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;
        
        if (context) {
          logMessage += ` [${context}]`;
        }
        
        if (requestId) {
          logMessage += ` [${requestId}]`;
        }
        
        if (tenantId) {
          logMessage += ` [tenant:${tenantId}]`;
        }
        
        logMessage += ` ${message}`;
        
        // Add metadata if present
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0) {
          logMessage += ` ${JSON.stringify(meta)}`;
        }
        
        return logMessage;
      }),
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (environment === 'development' || configService.get('LOG_CONSOLE', 'true') === 'true') {
      transports.push(
        new winston.transports.Console({
          level: logLevel,
          format: environment === 'development' ? consoleFormat : customFormat,
        }),
      );
    }

    // File transports for production
    if (environment !== 'test') {
      // General application logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/app-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: logLevel,
          format: customFormat,
        }),
      );

      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '90d',
          level: 'error',
          format: customFormat,
        }),
      );

      // Transaction logs (for audit and compliance)
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/transactions-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '50m',
          maxFiles: '7y', // 7 years for PCI compliance
          level: 'info',
          format: customFormat,
        }),
      );

      // Security logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/security-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '7y', // 7 years for compliance
          level: 'warn',
          format: customFormat,
        }),
      );

      // Performance logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/performance-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'info',
          format: customFormat,
        }),
      );
    }

    return {
      level: logLevel,
      format: customFormat,
      transports,
      exitOnError: false,
      // Prevent winston from handling uncaught exceptions in production
      handleExceptions: environment !== 'production',
      handleRejections: environment !== 'production',
    };
  }

  static createLoggerInstance(configService: ConfigService): winston.Logger {
    const options = this.createWinstonOptions(configService);
    return winston.createLogger(options);
  }
}
