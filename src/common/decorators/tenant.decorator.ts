import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    let tenantId = request.tenant?.id;

    // Debug logging
    console.log('=== @TenantId() DECORATOR DEBUG ===');
    console.log('Request has tenant:', !!request.tenant);
    console.log('Tenant ID from middleware:', tenantId);
    console.log('Tenant name:', request.tenant?.name);

    // Fallback: If tenant middleware didn't run, try to get tenant ID from JWT token
    if (!tenantId && request.user) {
      tenantId = request.user.tenantId;
      console.log('Fallback: Tenant ID from JWT user:', tenantId);
    }

    // Fallback: Try to get from X-Tenant-ID header
    if (!tenantId) {
      tenantId = request.headers['x-tenant-id'];
      console.log('Fallback: Tenant ID from header:', tenantId);
    }

    console.log('Final Tenant ID:', tenantId);

    return tenantId;
  },
);
