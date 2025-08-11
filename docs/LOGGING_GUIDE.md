# Payment Processing Platform - Logging Guide

## Overview

This payment processing platform implements comprehensive, production-grade logging using Winston with structured logging, multiple transports, and environment-specific configurations.

## Features

- **Structured Logging**: JSON-formatted logs with consistent fields
- **Multiple Log Levels**: Debug, Info, Warn, Error with appropriate routing
- **Environment-Specific Configuration**: Different settings for dev, staging, production
- **Log Rotation**: Automatic daily rotation with compression
- **Retention Policies**: Configurable retention periods for compliance
- **Performance Monitoring**: Request/response timing and system metrics
- **Security Logging**: Authentication, authorization, and security events
- **Transaction Logging**: Detailed payment processing audit trail
- **Health Monitoring**: System health checks and metrics

## Log Categories

### 1. Application Logs (`app-*.log`)
- General application events
- Business logic operations
- Service interactions
- Retention: 30 days

### 2. Error Logs (`error-*.log`)
- Application errors and exceptions
- Stack traces
- Failed operations
- Retention: 90 days

### 3. Transaction Logs (`transactions-*.log`)
- Payment processing events
- Transaction state changes
- Fraud detection results
- Retention: 7 years (PCI compliance)

### 4. Security Logs (`security-*.log`)
- Authentication events
- Authorization failures
- Security incidents
- Suspicious activities
- Retention: 7 years (compliance)

### 5. Performance Logs (`performance-*.log`)
- Request/response times
- System metrics
- Slow queries
- Resource usage
- Retention: 30 days

## Log Levels

### Development
- **DEBUG**: Detailed debugging information
- **INFO**: General information
- **WARN**: Warning conditions
- **ERROR**: Error conditions

### Production
- **INFO**: General information (default)
- **WARN**: Warning conditions
- **ERROR**: Error conditions
- **CRITICAL**: Critical system issues

## Environment Configuration

### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
LOG_CONSOLE=true
LOG_FILES_IN_DEV=false
```

### Staging
```env
NODE_ENV=staging
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_DIR=logs
```

### Production
```env
NODE_ENV=production
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_DIR=/var/log/payment-processing
ENABLE_PERFORMANCE_LOGGING=true
```

### Test
```env
NODE_ENV=test
LOG_SILENT_IN_TESTS=true
```

## Log Structure

### Standard Fields
```json
{
  "@timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "payment-processing",
  "environment": "production",
  "message": "Transaction processed successfully",
  "context": "TransactionProcessor",
  "requestId": "req-123456",
  "tenantId": "tenant-abc",
  "userId": "user-xyz"
}
```

### Transaction Log Example
```json
{
  "@timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "service": "payment-processing",
  "message": "Transaction TXN_123 created successfully",
  "context": "TransactionProcessor",
  "category": "transaction",
  "transactionId": "TXN_123",
  "merchantId": "merchant-456",
  "amount": 100.00,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "status": "pending",
  "riskScore": 15,
  "processingTime": 250,
  "tenantId": "tenant-abc",
  "userId": "user-xyz"
}
```

### Security Log Example
```json
{
  "@timestamp": "2024-01-01T12:00:00.000Z",
  "level": "WARN",
  "service": "payment-processing",
  "message": "Failed login attempt - invalid credentials",
  "context": "Authentication",
  "category": "auth_event",
  "success": false,
  "email": "user@example.com",
  "reason": "invalid_credentials",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "tenantId": "tenant-abc"
}
```

## Usage Examples

### Basic Logging
```typescript
import { AppLoggerService } from '../common/services/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: AppLoggerService) {}

  async processData() {
    this.logger.log('Processing data started', 'MyService');
    
    try {
      // Process data
      this.logger.log('Data processed successfully', 'MyService');
    } catch (error) {
      this.logger.error('Data processing failed', error.stack, 'MyService');
    }
  }
}
```

### Transaction Logging
```typescript
this.logger.logTransaction(
  'Transaction created',
  {
    transactionId: 'TXN_123',
    merchantId: 'merchant-456',
    amount: 100.00,
    currency: 'USD',
    paymentMethod: 'credit_card',
    status: 'pending',
    riskScore: 15,
  },
  { tenantId, userId, requestId }
);
```

### Security Logging
```typescript
this.logger.logSecurityEvent(
  'Suspicious login activity detected',
  {
    eventType: 'suspicious_activity',
    severity: 'high',
    description: 'Multiple failed login attempts',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    metadata: { attemptCount: 5 }
  },
  { tenantId, userId }
);
```

### Performance Logging
```typescript
this.logger.logPerformance(
  'Database query completed',
  {
    operation: 'SELECT users',
    duration: 150,
    endpoint: '/api/users',
    method: 'GET',
    statusCode: 200,
  },
  { requestId, tenantId }
);
```

## Log Monitoring

### Health Checks
The system includes automated health monitoring:
- Memory usage monitoring
- CPU load monitoring
- Disk space monitoring
- System metrics collection

### Log Cleanup
Automated log cleanup runs daily at 2 AM:
- Removes old log files based on retention policies
- Compresses archived logs
- Monitors disk space usage

### Alerts
Configure alerts for:
- High error rates
- Security incidents
- Performance degradation
- System resource issues

## Best Practices

### 1. Use Appropriate Log Levels
- **DEBUG**: Detailed debugging (development only)
- **INFO**: Normal operations
- **WARN**: Concerning but not critical
- **ERROR**: Errors requiring attention

### 2. Include Context
Always include relevant context:
- Request ID for tracing
- Tenant ID for multi-tenancy
- User ID for user actions

### 3. Sanitize Sensitive Data
Never log:
- Passwords
- Credit card numbers
- API keys
- Personal information

### 4. Use Structured Logging
Prefer structured data over string concatenation:
```typescript
// Good
this.logger.log('User created', 'UserService', { userId, email, role });

// Avoid
this.logger.log(`User ${userId} with email ${email} created`);
```

### 5. Log Errors with Stack Traces
```typescript
try {
  // risky operation
} catch (error) {
  this.logger.error('Operation failed', error.stack, 'ServiceName', {
    operation: 'operationName',
    parameters: sanitizedParams
  });
}
```

## Compliance

### PCI DSS Requirements
- Transaction logs retained for 7 years
- Security logs retained for 7 years
- Access to cardholder data logged
- Failed authentication attempts logged

### GDPR Considerations
- Personal data in logs is minimized
- Log retention policies respect data retention requirements
- Logs can be purged for data subject requests

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check LOG_LEVEL environment variable
   - Verify log directory permissions
   - Check LOG_CONSOLE setting

2. **High disk usage**
   - Review retention policies
   - Check log rotation configuration
   - Monitor log cleanup service

3. **Performance impact**
   - Adjust log levels in production
   - Disable debug logging
   - Use asynchronous logging

### Log Analysis
Use tools like:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Fluentd
- Grafana Loki

## Configuration Reference

### Environment Variables
```env
# Basic Configuration
NODE_ENV=production
LOG_LEVEL=info
LOG_DIR=logs
LOG_CONSOLE=true
APP_NAME=payment-processing

# Development
LOG_FILES_IN_DEV=false

# Testing
LOG_SILENT_IN_TESTS=true

# Production
ENABLE_PERFORMANCE_LOGGING=true

# Retention Policies
LOG_RETENTION_APP=30
LOG_RETENTION_ERROR=90
LOG_RETENTION_TRANSACTIONS=2555
LOG_RETENTION_SECURITY=2555
LOG_RETENTION_PERFORMANCE=30
```

## Support

For logging-related issues:
1. Check application logs for errors
2. Verify configuration settings
3. Review log file permissions
4. Monitor disk space usage
5. Check log rotation status
