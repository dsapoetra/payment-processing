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

    // Fallback: If tenant middleware didn't run, try to get tenant ID from JWT token
    if (!tenantId && request.user) {
      tenantId = request.user.tenantId;
    }

    // Fallback: Try to get from X-Tenant-ID header
    if (!tenantId) {
      tenantId = request.headers['x-tenant-id'];
    }

    return tenantId;
  },
);
