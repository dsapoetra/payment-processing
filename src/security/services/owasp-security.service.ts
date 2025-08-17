import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OwaspSecurityService {
  private readonly logger = new Logger(OwaspSecurityService.name);

  constructor(private configService: ConfigService) {}

  /**
   * A01:2021 – Broken Access Control
   * Implement proper authorization checks
   */
  validateResourceAccess(userId: string, tenantId: string, resourceTenantId: string): boolean {
    // Ensure user can only access resources within their tenant
    if (tenantId !== resourceTenantId) {
      this.logger.warn(`Access control violation: User ${userId} attempted to access resource from different tenant`, {
        userId,
        userTenant: tenantId,
        resourceTenant: resourceTenantId,
      });
      return false;
    }
    return true;
  }

  /**
   * A02:2021 – Cryptographic Failures
   * Secure password hashing and sensitive data encryption
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  encryptSensitiveData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY not configured');
    }

    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * A03:2021 – Injection
   * Input validation and sanitization
   */
  sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove XSS characters
      .replace(/(\r\n|\n|\r)/gm, '') // Remove line breaks
      .trim()
      .substring(0, 1000); // Limit length
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * A04:2021 – Insecure Design
   * Implement secure design patterns
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * A05:2021 – Security Misconfiguration
   * Security headers and configuration validation
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
  }

  /**
   * A06:2021 – Vulnerable and Outdated Components
   * Component security validation
   */
  validateDependencies(): { secure: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for development dependencies in production
    if (this.configService.get('NODE_ENV') === 'production') {
      // This would typically check package.json for dev dependencies
      // For now, we'll just log a warning
      this.logger.warn('Ensure no development dependencies are installed in production');
    }

    return {
      secure: issues.length === 0,
      issues,
    };
  }

  /**
   * A07:2021 – Identification and Authentication Failures
   * Secure authentication practices
   */
  validatePasswordStrength(password: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (password.length < 8) {
      issues.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * A08:2021 – Software and Data Integrity Failures
   * Implement integrity checks
   */
  generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(actualChecksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  /**
   * A09:2021 – Security Logging and Monitoring Failures
   * Enhanced security logging
   */
  logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details: this.sanitizeLogData(details),
    };

    switch (severity) {
      case 'critical':
        this.logger.error(`SECURITY CRITICAL: ${event}`, logData);
        break;
      case 'high':
        this.logger.error(`SECURITY HIGH: ${event}`, logData);
        break;
      case 'medium':
        this.logger.warn(`SECURITY MEDIUM: ${event}`, logData);
        break;
      case 'low':
        this.logger.log(`SECURITY LOW: ${event}`, logData);
        break;
    }
  }

  /**
   * A10:2021 – Server-Side Request Forgery (SSRF)
   * URL validation for external requests
   */
  validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Block private IP ranges and localhost
      const hostname = parsedUrl.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return false;
      }
      
      // Block private IP ranges
      const privateRanges = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./, // Link-local
        /^::1$/, // IPv6 localhost
        /^fc00:/, // IPv6 private
      ];
      
      return !privateRanges.some(range => range.test(hostname));
    } catch {
      return false;
    }
  }

  private sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
