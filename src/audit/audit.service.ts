import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditAction, AuditLevel } from './entities/audit-log.entity';

export interface CreateAuditLogDto {
  action: AuditAction;
  level?: AuditLevel;
  entityType: string;
  entityId?: string;
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  source?: string;
  isSecurityEvent?: boolean;
  isPciRelevant?: boolean;
  tenantId: string;
  userId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...createAuditLogDto,
      level: createAuditLogDto.level || AuditLevel.INFO,
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(
    tenantId: string,
    filters?: {
      entityType?: string;
      action?: AuditAction;
      level?: AuditLevel;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      isSecurityEvent?: boolean;
      isPciRelevant?: boolean;
    },
    page = 1,
    limit = 50,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.tenantId = :tenantId', { tenantId });

    if (filters?.entityType) {
      queryBuilder.andWhere('audit.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters?.action) {
      queryBuilder.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.level) {
      queryBuilder.andWhere('audit.level = :level', { level: filters.level });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.isSecurityEvent !== undefined) {
      queryBuilder.andWhere('audit.isSecurityEvent = :isSecurityEvent', {
        isSecurityEvent: filters.isSecurityEvent,
      });
    }

    if (filters?.isPciRelevant !== undefined) {
      queryBuilder.andWhere('audit.isPciRelevant = :isPciRelevant', {
        isPciRelevant: filters.isPciRelevant,
      });
    }

    const total = await queryBuilder.getCount();

    const data = await queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    tenantId: string,
  ): Promise<AuditLog[]> {
    return await this.auditLogRepository.find({
      where: { entityType, entityId, tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSecurityEvents(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const where: any = { tenantId, isSecurityEvent: true };

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    return await this.auditLogRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPciRelevantEvents(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const where: any = { tenantId, isPciRelevant: true };

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    }

    return await this.auditLogRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isPciRelevant = false') // Keep PCI relevant logs longer
      .execute();

    return result.affected || 0;
  }
}
