import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    const httpStatus = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    // Create log context
    const logContext = {
      requestId: request.requestId,
      tenantId: request.tenant?.id,
      userId: request.user?.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      endpoint: request.originalUrl,
      method: request.method,
    };

    // Log the exception
    if (httpStatus >= 500) {
      // Server errors - log as error
      this.logger.error(
        `Unhandled exception: ${message}`,
        stack,
        'ExceptionFilter',
        {
          ...logContext,
          statusCode: httpStatus,
          exceptionType: exception instanceof Error ? exception.constructor.name : 'Unknown',
        }
      );
    } else if (httpStatus >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `Client error: ${message}`,
        'ExceptionFilter',
        {
          ...logContext,
          statusCode: httpStatus,
          exceptionType: exception instanceof Error ? exception.constructor.name : 'Unknown',
        }
      );
    }

    // Create error response
    const errorResponse = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      requestId: request.requestId,
      ...(process.env.NODE_ENV === 'development' && { stack }),
    };

    // Add validation errors if present
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        Object.assign(errorResponse, exceptionResponse);
      }
    }

    response.status(httpStatus).json(errorResponse);
  }
}
