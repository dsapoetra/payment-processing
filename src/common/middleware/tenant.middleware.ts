import { Injectable, NestMiddleware, BadRequestException, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';

interface RequestWithTenant extends Request {
  tenant?: Tenant;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Skip tenant middleware for health endpoints, swagger docs, public registration, public login, and debug endpoints
    const skipPaths = ['/api/v1/health', '/swagger/docs', '/api/v1/auth/public-register', '/api/v1/auth/public-login', '/api/v1/auth/debug'];
    if (skipPaths.some(path => req.originalUrl.startsWith(path))) {
      return next();
    }

    try {
      let tenant: Tenant | null = null;

      // Try to get tenant from subdomain
      const host = req.get('host');
      if (host) {
        const subdomain = this.extractSubdomain(host);
        if (subdomain) {
          tenant = await this.tenantRepository.findOne({
            where: { subdomain, status: TenantStatus.ACTIVE },
          });
        }
      }

      // Try to get tenant from API key header
      if (!tenant) {
        const apiKey = req.get('X-API-Key');
        if (apiKey) {
          tenant = await this.tenantRepository.findOne({
            where: { apiKey, status: TenantStatus.ACTIVE },
          });
        }
      }

      // Try to get tenant from custom header
      if (!tenant) {
        const tenantId = req.get('X-Tenant-ID');
        if (tenantId) {
          tenant = await this.tenantRepository.findOne({
            where: { id: tenantId, status: TenantStatus.ACTIVE },
          });
        }
      }

      if (!tenant) {
        throw new BadRequestException('Tenant not found or inactive');
      }

      // Check tenant limits and status
      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new BadRequestException('Tenant is not active');
      }

      // Update last activity
      await this.tenantRepository.update(tenant.id, {
        lastActivityAt: new Date(),
      });

      req.tenant = tenant;
      next();
    } catch (error) {
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
