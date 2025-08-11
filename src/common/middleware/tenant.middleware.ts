import { Injectable, NestMiddleware, BadRequestException, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import { AppLoggerService } from '../services/logger.service';

interface RequestWithTenant extends Request {
  tenant?: Tenant;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly logger: AppLoggerService,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Skip tenant middleware for health endpoints, swagger docs, public registration, public login, debug endpoints, and UI paths
    const skipPaths = [
      '/api/v1/health',
      '/swagger',
      '/api/v1/auth/public-register',
      '/api/v1/auth/public-login',
      '/api/v1/auth/debug',
      '/ui/auth/login.html',
      '/ui/auth/register.html',
      '/ui/admin', // Admin interface - has its own auth
      '/setup-tenant.html',
      '/health',
      '/', // Root path
      '/favicon.ico',
      '/static/', // Static assets
      '/assets/', // Static assets
      '/css/', // CSS files
      '/js/', // JavaScript files
      '/images/', // Image files
    ];

    // Check if the request path should skip tenant middleware
    if (skipPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    try {
      let tenant: Tenant | null = null;

      this.logger.debug(
        `Tenant middleware processing: ${req.method} ${req.originalUrl}`,
        'TenantMiddleware'
      );

      // Try to get tenant from subdomain
      const host = req.get('host');
      if (host) {
        const subdomain = this.extractSubdomain(host);
        if (subdomain) {
          tenant = await this.tenantRepository.findOne({
            where: { subdomain, status: TenantStatus.ACTIVE },
          });
          this.logger.debug(
            `Tenant lookup by subdomain: ${subdomain} - ${tenant ? 'found' : 'not found'}`,
            'TenantMiddleware'
          );
        }
      }

      // Try to get tenant from API key header
      if (!tenant) {
        const apiKey = req.get('X-API-Key');
        if (apiKey) {
          tenant = await this.tenantRepository.findOne({
            where: { apiKey, status: TenantStatus.ACTIVE },
          });
          this.logger.debug(
            `Tenant lookup by API key - ${tenant ? 'found' : 'not found'}`,
            'TenantMiddleware'
          );
        }
      }

      // Try to get tenant from custom header
      if (!tenant) {
        const tenantId = req.get('X-Tenant-ID');
        if (tenantId) {
          tenant = await this.tenantRepository.findOne({
            where: { id: tenantId, status: TenantStatus.ACTIVE },
          });
          this.logger.debug(
            `Tenant lookup by X-Tenant-ID (${tenantId}) - ${tenant ? `found (${tenant.name})` : 'not found'}`,
            'TenantMiddleware'
          );
        }
      }

      if (!tenant) {
        this.logger.error(
          'Tenant not found or inactive',
          '',
          'TenantMiddleware',
          { url: req.originalUrl }
        );
        throw new BadRequestException('Tenant not found or inactive');
      }

      // Check tenant limits and status
      if (tenant.status !== TenantStatus.ACTIVE) {
        this.logger.error(
          `Tenant is not active, status: ${tenant.status}`,
          '',
          'TenantMiddleware',
          { tenantId: tenant.id, status: tenant.status }
        );
        throw new BadRequestException('Tenant is not active');
      }

      // Update last activity
      await this.tenantRepository.update(tenant.id, {
        lastActivityAt: new Date(),
      });

      req.tenant = tenant;
      this.logger.debug(
        `Tenant successfully attached to request: ${tenant.id} (${tenant.name})`,
        'TenantMiddleware',
        { tenantId: tenant.id, tenantName: tenant.name }
      );
      next();
    } catch (error) {
      this.logger.error(
        `Tenant middleware error: ${error.message}`,
        error.stack,
        'TenantMiddleware',
        { url: req.originalUrl, error: error.message }
      );

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid tenant configuration');
    }
  }

  private extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  }
}
