import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new BadRequestException('Tenant context is required');
    }

    // Add tenant context to all database queries
    request.tenantId = tenant.id;

    return next.handle().pipe(
      map((data) => {
        // Filter out any data that doesn't belong to the current tenant
        if (Array.isArray(data)) {
          return data.filter((item) => {
            if (item && typeof item === 'object' && 'tenantId' in item) {
              return item.tenantId === tenant.id;
            }
            return true;
          });
        }

        if (data && typeof data === 'object' && 'tenantId' in data) {
          if (data.tenantId !== tenant.id) {
            throw new BadRequestException('Access denied to resource');
          }
        }

        return data;
      }),
    );
  }
}
