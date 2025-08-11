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
    const tenantId = request.tenant?.id;

    // Debug logging
    console.log('=== @TenantId() DECORATOR DEBUG ===');
    console.log('Request has tenant:', !!request.tenant);
    console.log('Tenant ID:', tenantId);
    console.log('Tenant name:', request.tenant?.name);

    return tenantId;
  },
);
