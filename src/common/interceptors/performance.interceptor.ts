import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logger.service';

interface RequestWithContext extends Request {
  requestId?: string;
  tenant?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpuUsage = process.cpuUsage();

    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const { statusCode } = response;

        // Calculate memory delta
        const memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        };

        // Log performance metrics
        this.logger.logPerformance(
          `${method} ${originalUrl} completed in ${duration}ms`,
          {
            operation: `${method} ${originalUrl}`,
            duration,
            endpoint: originalUrl,
            method,
            statusCode,
            memoryUsage: endMemory,
            memoryDelta,
            cpuUsage: endCpuUsage,
          },
          {
            requestId: request.requestId,
            tenantId: request.tenant?.id,
            userId: request.user?.id,
          }
        );

        // Log slow requests with more detail
        if (duration > 2000) { // 2 seconds threshold
          this.logger.warn(
            `SLOW REQUEST DETECTED: ${method} ${originalUrl} took ${duration}ms`,
            'Performance',
            {
              requestId: request.requestId,
              tenantId: request.tenant?.id,
              userId: request.user?.id,
              duration,
              endpoint: originalUrl,
              method,
              statusCode,
              memoryUsage: endMemory,
              memoryDelta,
              cpuUsage: endCpuUsage,
              threshold: 2000,
              severity: duration > 5000 ? 'high' : 'medium',
            }
          );
        }

        // Log high memory usage
        if (endMemory.heapUsed > 100 * 1024 * 1024) { // 100MB threshold
          this.logger.warn(
            `HIGH MEMORY USAGE: ${Math.round(endMemory.heapUsed / 1024 / 1024)}MB heap used`,
            'Performance',
            {
              requestId: request.requestId,
              tenantId: request.tenant?.id,
              userId: request.user?.id,
              endpoint: originalUrl,
              method,
              memoryUsage: endMemory,
              heapUsedMB: Math.round(endMemory.heapUsed / 1024 / 1024),
              threshold: 100,
            }
          );
        }
      }),
    );
  }
}
