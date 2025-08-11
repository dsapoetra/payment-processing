import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestWithContext extends Request {
  requestId?: string;
  startTime?: number;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction) {
    // Add request ID
    req.requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Add start time for performance tracking
    req.startTime = Date.now();
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    // Add correlation ID for distributed tracing
    const correlationId = req.headers['x-correlation-id'] as string || req.requestId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    next();
  }
}
