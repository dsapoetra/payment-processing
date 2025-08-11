import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';
import { AppLoggerService } from '../../common/services/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      const user = await this.authService.validateUserById(payload.sub);

      if (!user) {
        this.logger.logSecurityEvent(
          'JWT validation failed - user not found',
          {
            eventType: 'invalid_token',
            severity: 'medium',
            description: `JWT token validation failed - user not found: ${payload.sub}`,
            metadata: { userId: payload.sub, tenantId: payload.tenantId }
          },
          { tenantId: payload.tenantId, userId: payload.sub }
        );
        throw new UnauthorizedException('User not found or inactive');
      }

      if (user.tenantId !== payload.tenantId) {
        this.logger.logSecurityEvent(
          'JWT validation failed - tenant mismatch',
          {
            eventType: 'unauthorized_access',
            severity: 'high',
            description: `JWT token validation failed - tenant mismatch for user: ${user.email}`,
            metadata: {
              userId: payload.sub,
              tokenTenantId: payload.tenantId,
              userTenantId: user.tenantId
            }
          },
          { tenantId: payload.tenantId, userId: payload.sub }
        );
        throw new UnauthorizedException('Invalid tenant context');
      }

      // Log successful token validation (debug level to avoid noise)
      this.logger.debug(
        `JWT token validated successfully for user ${user.email}`,
        'Authentication',
        {
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          role: user.role
        }
      );

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `JWT validation error: ${error.message}`,
        error.stack,
        'Authentication',
        { userId: payload.sub, tenantId: payload.tenantId }
      );
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
