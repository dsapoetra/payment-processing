import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logger.service';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithTenant extends Request {
  tenant?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    email: string;
  };
  requestId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Generate request ID if not present
    if (!request.requestId) {
      request.requestId = uuidv4();
    }

    // Extract request information
    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const contentLength = headers['content-length'] || '0';
    
    // Create context for logging
    const logContext = {
      requestId: request.requestId,
      tenantId: request.tenant?.id,
      userId: request.user?.id,
      ipAddress: ip,
      userAgent,
      endpoint: originalUrl,
      method,
    };

    // Log incoming request
    this.logger.log(
      `Incoming ${method} ${originalUrl}`,
      'HTTP',
      {
        ...logContext,
        contentLength: parseInt(contentLength, 10),
        headers: this.sanitizeHeaders(headers),
      }
    );

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;

        // Log successful response
        this.logger.logRequest(
          `${method} ${originalUrl} - ${statusCode}`,
          method,
          originalUrl,
          statusCode,
          duration,
          {
            ...logContext,
            responseSize: JSON.stringify(data || {}).length,
          }
        );

        // Log slow requests
        if (duration > 1000) {
          this.logger.logPerformance(
            `Slow request detected: ${method} ${originalUrl}`,
            {
              operation: `${method} ${originalUrl}`,
              duration,
              endpoint: originalUrl,
              method,
              statusCode,
            },
            logContext
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.logger.logApiError(
          `${method} ${originalUrl} - ${statusCode} - ${error.message}`,
          error,
          method,
          originalUrl,
          {
            ...logContext,
            duration,
            statusCode,
          }
        );

        // Re-throw the error
        throw error;
      }),
    );
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '***';
      }
    });

    return sanitized;
  }
}
