import { Injectable } from '@nestjs/common';
import { AppLoggerService } from './logger.service';

export interface QueryLogData {
  query: string;
  parameters?: any[];
  duration: number;
  affectedRows?: number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  table?: string;
  error?: string;
}

@Injectable()
export class DatabaseLoggerService {
  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Log database query execution
   */
  logQuery(data: QueryLogData, context?: { tenantId?: string; userId?: string; requestId?: string }) {
    const logContext = {
      context: 'Database',
      category: 'db_query',
      ...context,
    };

    // Sanitize query for logging (remove sensitive data)
    const sanitizedQuery = this.sanitizeQuery(data.query);

    if (data.error) {
      this.logger.error(
        `Database query failed: ${data.error}`,
        undefined,
        'Database',
        {
          ...logContext,
          query: sanitizedQuery,
          parameters: this.sanitizeParameters(data.parameters),
          duration: data.duration,
          operation: data.operation,
          table: data.table,
          error: data.error,
        }
      );
    } else if (data.duration > 1000) { // Log slow queries (>1s)
      this.logger.logSlowQuery(
        `Slow query detected: ${data.operation} on ${data.table || 'unknown'} took ${data.duration}ms`,
        sanitizedQuery,
        data.duration,
        {
          ...logContext,
          parameters: this.sanitizeParameters(data.parameters),
          affectedRows: data.affectedRows,
          operation: data.operation,
          table: data.table,
          threshold: 1000,
        }
      );
    } else {
      // Log normal queries at debug level
      this.logger.debug(
        `${data.operation} query executed in ${data.duration}ms`,
        'Database',
        {
          ...logContext,
          query: sanitizedQuery,
          parameters: this.sanitizeParameters(data.parameters),
          duration: data.duration,
          affectedRows: data.affectedRows,
          operation: data.operation,
          table: data.table,
        }
      );
    }
  }

  /**
   * Log database connection events
   */
  logConnection(event: 'connect' | 'disconnect' | 'error', details?: any, context?: any) {
    const logContext = {
      context: 'Database',
      category: 'db_connection',
      ...context,
    };

    switch (event) {
      case 'connect':
        this.logger.log(
          'Database connection established',
          'Database',
          { ...logContext, event, ...details }
        );
        break;
      case 'disconnect':
        this.logger.log(
          'Database connection closed',
          'Database',
          { ...logContext, event, ...details }
        );
        break;
      case 'error':
        this.logger.error(
          `Database connection error: ${details?.error || 'Unknown error'}`,
          details?.stack,
          'Database',
          { ...logContext, event, ...details }
        );
        break;
    }
  }

  /**
   * Log database transaction events
   */
  logTransaction(
    event: 'begin' | 'commit' | 'rollback',
    transactionId?: string,
    context?: { tenantId?: string; userId?: string; requestId?: string }
  ) {
    const logContext = {
      context: 'Database',
      category: 'db_transaction',
      transactionId,
      ...context,
    };

    this.logger.debug(
      `Database transaction ${event}${transactionId ? ` (${transactionId})` : ''}`,
      'Database',
      { ...logContext, event }
    );
  }

  /**
   * Log database migration events
   */
  logMigration(
    event: 'start' | 'complete' | 'error',
    migrationName: string,
    details?: any
  ) {
    const logContext = {
      context: 'Database',
      category: 'db_migration',
      migrationName,
    };

    switch (event) {
      case 'start':
        this.logger.log(
          `Database migration started: ${migrationName}`,
          'Database',
          { ...logContext, event, ...details }
        );
        break;
      case 'complete':
        this.logger.log(
          `Database migration completed: ${migrationName}`,
          'Database',
          { ...logContext, event, duration: details?.duration, ...details }
        );
        break;
      case 'error':
        this.logger.error(
          `Database migration failed: ${migrationName} - ${details?.error}`,
          details?.stack,
          'Database',
          { ...logContext, event, error: details?.error, ...details }
        );
        break;
    }
  }

  /**
   * Sanitize SQL query for logging
   */
  private sanitizeQuery(query: string): string {
    if (!query) return '';
    
    // Remove or mask sensitive patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'")
      .replace(/key\s*=\s*'[^']*'/gi, "key='***'")
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****') // Credit card numbers
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****'); // SSN pattern
  }

  /**
   * Sanitize query parameters for logging
   */
  private sanitizeParameters(parameters?: any[]): any[] {
    if (!parameters) return [];
    
    return parameters.map(param => {
      if (typeof param === 'string') {
        // Check if parameter looks like sensitive data
        if (param.length > 20 && /^[A-Za-z0-9+/=]+$/.test(param)) {
          return '***'; // Likely base64 encoded data
        }
        if (/password|token|secret|key/i.test(param)) {
          return '***';
        }
        // Mask credit card numbers
        if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(param)) {
          return '****-****-****-****';
        }
      }
      return param;
    });
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string | undefined {
    if (!query) return undefined;
    
    const patterns = [
      /FROM\s+([`"]?)(\w+)\1/i,
      /INTO\s+([`"]?)(\w+)\1/i,
      /UPDATE\s+([`"]?)(\w+)\1/i,
      /DELETE\s+FROM\s+([`"]?)(\w+)\1/i,
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return match[2];
      }
    }
    
    return undefined;
  }

  /**
   * Determine query operation type
   */
  private getQueryOperation(query: string): QueryLogData['operation'] {
    if (!query) return 'OTHER';
    
    const upperQuery = query.trim().toUpperCase();
    
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    
    return 'OTHER';
  }
}
