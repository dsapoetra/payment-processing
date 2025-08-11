import { Injectable } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditLevel } from '../../audit/entities/audit-log.entity';
import { AppLoggerService } from '../../common/services/logger.service';

export interface SecurityEvent {
  id: string;
  type: 'login_failure' | 'unauthorized_access' | 'data_breach' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    private readonly auditService: AuditService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Log a security event
   */
  async logSecurityEvent(
    event: Omit<SecurityEvent, 'id' | 'timestamp'>,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    // Log to structured logger
    this.logger.logSecurityEvent(
      event.description,
      {
        eventType: event.type,
        severity: event.severity,
        description: event.description,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        userId,
        tenantId,
        metadata: event.metadata,
      },
      { tenantId, userId, ipAddress: event.ipAddress, userAgent: event.userAgent }
    );

    // Also log to audit system for compliance
    await this.auditService.log({
      action: AuditAction.ACCESS,
      level: this.mapSeverityToLevel(event.severity),
      entityType: 'SecurityEvent',
      description: event.description,
      tenantId,
      userId,
      metadata: {
        eventType: event.type,
        severity: event.severity,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        ...event.metadata,
      },
      isSecurityEvent: true,
      isPciRelevant: event.type === 'data_breach' || event.type === 'unauthorized_access',
    });

    // Log critical events with additional alerting context
    if (event.severity === 'critical') {
      this.logger.error(
        `CRITICAL SECURITY EVENT: ${event.description}`,
        undefined,
        'SecurityAudit',
        {
          tenantId,
          userId,
          eventType: event.type,
          severity: event.severity,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          requiresImmedateAttention: true,
          ...event.metadata,
        }
      );
    }
  }

  /**
   * Get security events for a tenant
   */
  async getSecurityEvents(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    return this.auditService.getSecurityEvents(tenantId, startDate, endDate);
  }

  /**
   * Get PCI relevant events for a tenant
   */
  async getPciRelevantEvents(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    return this.auditService.getPciRelevantEvents(tenantId, startDate, endDate);
  }

  private mapSeverityToLevel(severity: string): AuditLevel {
    switch (severity) {
      case 'critical':
        return AuditLevel.CRITICAL;
      case 'high':
        return AuditLevel.ERROR;
      case 'medium':
        return AuditLevel.WARNING;
      case 'low':
      default:
        return AuditLevel.INFO;
    }
  }
}
