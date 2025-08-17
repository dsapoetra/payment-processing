import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { OwaspSecurityService } from '../services/owasp-security.service';
import * as crypto from 'crypto';

interface SecurityRequest extends Request {
  securityContext?: {
    requestId: string;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    suspicious: boolean;
  };
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly suspiciousPatterns = [
    // SQL Injection patterns
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal
    /\.\.\//g,
    /\.\.\\/g,
    // Command injection
    /[;&|`$()]/g,
  ];

  constructor(private readonly owaspSecurityService: OwaspSecurityService) {}

  use(req: SecurityRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    // Generate request ID for tracking
    const requestId = crypto.randomUUID();
    req.securityContext = {
      requestId,
      timestamp: new Date(),
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      suspicious: false,
    };

    // Add security headers
    this.addSecurityHeaders(res);

    // Validate request
    const validationResult = this.validateRequest(req);
    if (!validationResult.valid) {
      this.owaspSecurityService.logSecurityEvent(
        'Malicious request blocked',
        {
          requestId,
          ip: req.securityContext.ipAddress,
          userAgent: req.securityContext.userAgent,
          url: req.originalUrl,
          method: req.method,
          issues: validationResult.issues,
        },
        'high'
      );

      res.status(400).json({
        error: 'Bad Request',
        message: 'Request contains potentially malicious content',
        requestId,
      });
      return;
    }

    // Check for suspicious patterns
    if (this.detectSuspiciousActivity(req)) {
      req.securityContext.suspicious = true;
      this.owaspSecurityService.logSecurityEvent(
        'Suspicious activity detected',
        {
          requestId,
          ip: req.securityContext.ipAddress,
          userAgent: req.securityContext.userAgent,
          url: req.originalUrl,
          method: req.method,
        },
        'medium'
      );
    }

    // Log request for monitoring
    this.logRequest(req);

    // Add response time tracking
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.logResponse(req, res, duration);
    });

    next();
  }

  private addSecurityHeaders(res: Response): void {
    const headers = this.owaspSecurityService.getSecurityHeaders();
    
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add additional security headers
    res.setHeader('X-Request-ID', crypto.randomUUID());
    res.setHeader('X-Powered-By', ''); // Remove server information
  }

  private validateRequest(req: SecurityRequest): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Validate URL length
    if (req.originalUrl.length > 2048) {
      issues.push('URL too long');
    }

    // Validate headers
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length > 512) {
      issues.push('Invalid or missing User-Agent');
    }

    // Validate content length
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      issues.push('Request body too large');
    }

    // Check for null bytes
    if (req.originalUrl.includes('\0')) {
      issues.push('Null byte in URL');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private detectSuspiciousActivity(req: SecurityRequest): boolean {
    const checkString = `${req.originalUrl} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
    
    return this.suspiciousPatterns.some(pattern => pattern.test(checkString));
  }

  private getClientIp(req: Request): string {
    return (
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private logRequest(req: SecurityRequest): void {
    const logData = {
      requestId: req.securityContext?.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.securityContext?.ipAddress,
      userAgent: req.securityContext?.userAgent,
      suspicious: req.securityContext?.suspicious,
      timestamp: req.securityContext?.timestamp,
    };

    this.logger.log('Incoming request', logData);
  }

  private logResponse(req: SecurityRequest, res: Response, duration: number): void {
    const logData = {
      requestId: req.securityContext?.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.securityContext?.ipAddress,
      suspicious: req.securityContext?.suspicious,
    };

    if (res.statusCode >= 400) {
      this.logger.warn('Request completed with error', logData);
    } else {
      this.logger.log('Request completed successfully', logData);
    }

    // Log slow requests
    if (duration > 5000) { // 5 seconds
      this.owaspSecurityService.logSecurityEvent(
        'Slow request detected',
        logData,
        'low'
      );
    }

    // Log suspicious successful requests
    if (req.securityContext?.suspicious && res.statusCode < 400) {
      this.owaspSecurityService.logSecurityEvent(
        'Suspicious request completed successfully',
        logData,
        'medium'
      );
    }
  }
}
