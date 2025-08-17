import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { OwaspSecurityService } from '../services/owasp-security.service';

@Injectable()
export class SecurityValidationPipe implements PipeTransform {
  private readonly logger = new Logger(SecurityValidationPipe.name);

  constructor(private readonly owaspSecurityService: OwaspSecurityService) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      return value;
    }

    // Validate and sanitize based on parameter type
    switch (metadata.type) {
      case 'body':
        return this.validateBody(value);
      case 'query':
        return this.validateQuery(value);
      case 'param':
        return this.validateParam(value, metadata.data);
      default:
        return value;
    }
  }

  private validateBody(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized = { ...body };

    // Recursively validate and sanitize object properties
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        // Check for injection patterns
        if (this.containsMaliciousContent(value)) {
          this.logger.warn(`Malicious content detected in body field: ${key}`, { value });
          throw new BadRequestException(`Invalid content in field: ${key}`);
        }
        
        // Sanitize string values
        sanitized[key] = this.owaspSecurityService.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively validate nested objects
        sanitized[key] = this.validateBody(value);
      }
    }

    return sanitized;
  }

  private validateQuery(query: any): any {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const sanitized = { ...query };

    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        // Check for injection patterns
        if (this.containsMaliciousContent(value)) {
          this.logger.warn(`Malicious content detected in query parameter: ${key}`, { value });
          throw new BadRequestException(`Invalid query parameter: ${key}`);
        }

        // Sanitize query parameters
        sanitized[key] = this.owaspSecurityService.sanitizeInput(value);
      } else if (Array.isArray(value)) {
        // Handle array query parameters
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.owaspSecurityService.sanitizeInput(item) : item
        );
      }
    }

    return sanitized;
  }

  private validateParam(param: any, paramName?: string): any {
    if (typeof param !== 'string') {
      return param;
    }

    // Check for injection patterns
    if (this.containsMaliciousContent(param)) {
      this.logger.warn(`Malicious content detected in URL parameter: ${paramName}`, { param });
      throw new BadRequestException(`Invalid URL parameter: ${paramName}`);
    }

    // Validate specific parameter types
    if (paramName === 'id' || paramName?.endsWith('Id')) {
      if (!this.owaspSecurityService.validateUUID(param)) {
        throw new BadRequestException(`Invalid UUID format for parameter: ${paramName}`);
      }
    }

    return this.owaspSecurityService.sanitizeInput(param);
  }

  private containsMaliciousContent(input: string): boolean {
    const maliciousPatterns = [
      // SQL Injection
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|declare|cast|convert)\b)/i,
      /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
      /('|\"|;|--|\*|\/\*|\*\/)/,
      
      // XSS
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      
      // Path Traversal
      /\.\.\//g,
      /\.\.\\/g,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
      
      // Command Injection
      /[;&|`$(){}]/g,
      /\b(cat|ls|dir|type|copy|move|del|rm|mkdir|rmdir|chmod|chown)\b/i,
      
      // LDAP Injection
      /[()&|!]/g,
      
      // XML Injection
      /<!(\[CDATA\[|DOCTYPE|ENTITY)/i,
      
      // NoSQL Injection
      /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex/i,
      
      // Template Injection
      /\{\{.*\}\}/g,
      /\$\{.*\}/g,
      
      // File inclusion
      /\b(file|http|https|ftp|data):/i,
      
      // Null bytes
      /\0/g,
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }
}
