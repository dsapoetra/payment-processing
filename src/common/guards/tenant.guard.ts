import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('Tenant context is required');
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      throw new ForbiddenException('Tenant is not active');
    }

    // Check trial expiration
    if (tenant.trialEndsAt && new Date() > tenant.trialEndsAt) {
      throw new ForbiddenException('Tenant trial has expired');
    }

    return true;
  }
}
