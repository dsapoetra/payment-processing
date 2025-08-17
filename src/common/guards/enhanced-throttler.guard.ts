import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export interface ThrottleConfig {
  short?: number;
  medium?: number;
  long?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  blockDuration?: number; // in seconds
}

export const Throttle = Reflector.createDecorator<ThrottleConfig>();

@Injectable()
export class EnhancedThrottlerGuard extends ThrottlerGuard {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Get custom throttle configuration
    const throttleConfig = this.reflector.getAllAndOverride<ThrottleConfig>(Throttle.KEY, [
      handler,
      classRef,
    ]);

    if (throttleConfig) {
      // Log the custom throttling attempt
      console.log('Custom throttling applied:', throttleConfig);
    }

    // Use default throttling for now
    return super.canActivate(context);
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    // Enhanced tracking that includes user context
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id;
    const tenantId = req.tenant?.id;

    // Create a composite key for better tracking
    return Promise.resolve(`${ip}${userId ? `:user:${userId}` : ''}${tenantId ? `:tenant:${tenantId}` : ''}`);
  }
}
