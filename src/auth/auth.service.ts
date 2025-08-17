import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import { Tenant, TenantStatus, TenantPlan } from '../tenants/entities/tenant.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse } from './interfaces/auth-response.interface';
import { AppLoggerService } from '../common/services/logger.service';
import { OwaspSecurityService } from '../security/services/owasp-security.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly owaspSecurityService: OwaspSecurityService,
  ) {}

  async register(registerDto: RegisterDto, tenantId: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const logContext = { tenantId, ipAddress, userAgent };

    this.logger.debug(
      `Registration attempt for email: ${registerDto.email}`,
      'Authentication',
      { ...logContext, email: registerDto.email }
    );

    try {
      // Check if user already exists in this tenant
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email, tenantId },
      });

      if (existingUser) {
        this.logger.logSecurityEvent(
          `Registration attempt with existing email: ${registerDto.email}`,
          {
            eventType: 'duplicate_registration',
            severity: 'low',
            description: `Attempted registration with existing email: ${registerDto.email}`,
            ipAddress,
            userAgent,
            metadata: { email: registerDto.email, tenantId }
          },
          logContext
        );
        throw new ConflictException('User already exists in this tenant');
      }

      // Validate password strength
      const passwordValidation = this.owaspSecurityService.validatePasswordStrength(registerDto.password);
      if (!passwordValidation.valid) {
        this.logger.warn(
          `Password validation failed for registration: ${registerDto.email}`,
          'Authentication',
          { ...logContext, email: registerDto.email, issues: passwordValidation.issues }
        );
        throw new BadRequestException(`Password does not meet security requirements: ${passwordValidation.issues.join(', ')}`);
      }

      // Hash password using OWASP security service
      const passwordHash = await this.owaspSecurityService.hashPassword(registerDto.password);

      // Create user
      const user = this.userRepository.create({
        ...registerDto,
        passwordHash,
        tenantId,
        status: UserStatus.PENDING_VERIFICATION,
      });

      const savedUser = await this.userRepository.save(user);

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      // Log successful registration
      this.logger.logAuthenticationEvent(
        `User registration successful for ${savedUser.email}`,
        true,
        savedUser.id,
        {
          ...logContext,
          email: savedUser.email,
          role: savedUser.role,
          status: savedUser.status
        }
      );

      this.logger.logBusinessEvent(
        `New user registered: ${savedUser.email}`,
        'user_registration',
        'User',
        savedUser.id,
        logContext
      );

      return {
        user: this.sanitizeUser(savedUser),
        ...tokens,
      };
    } catch (error) {
      this.logger.error(
        `Registration failed for ${registerDto.email}: ${error.message}`,
        error.stack,
        'Authentication',
        { ...logContext, email: registerDto.email }
      );
      throw error;
    }
  }

  async publicLogin(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    this.logger.debug(
      `Public login attempt for email: ${loginDto.email}`,
      'Authentication',
      { email: loginDto.email, ipAddress, userAgent }
    );

    try {
      // Find user by email globally (across all tenants)
      const user = await this.userRepository.findOne({
        where: { email: loginDto.email },
        relations: ['tenant'],
      });

      this.logger.debug(
        `User lookup result for ${loginDto.email}: ${user ? 'FOUND' : 'NOT FOUND'}`,
        'Authentication',
        { email: loginDto.email, userId: user?.id, tenantId: user?.tenant?.id, tenantStatus: user?.tenant?.status }
      );

      if (!user) {
        this.logger.logSecurityEvent(
          `Public login attempt with non-existent email: ${loginDto.email}`,
          {
            eventType: 'invalid_login',
            severity: 'medium',
            description: `Login attempt with non-existent email: ${loginDto.email}`,
            metadata: { email: loginDto.email, ipAddress, userAgent }
          }
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.tenant) {
        this.logger.logSecurityEvent(
          `Public login attempt for user without tenant: ${loginDto.email}`,
          {
            eventType: 'invalid_login',
            severity: 'high',
            description: `User exists but has no tenant: ${loginDto.email}`,
            metadata: { email: loginDto.email, userId: user.id, ipAddress, userAgent }
          }
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.tenant.status !== TenantStatus.ACTIVE) {
        this.logger.logSecurityEvent(
          `Public login attempt for inactive tenant: ${user.tenant.name}`,
          {
            eventType: 'inactive_tenant_login',
            severity: 'medium',
            description: `Login attempt for inactive tenant: ${user.tenant.name}`,
            metadata: { email: loginDto.email, tenantId: user.tenant.id, tenantStatus: user.tenant.status, ipAddress, userAgent }
          }
        );
        throw new UnauthorizedException('Account is not active');
      }

      // Now use the existing login logic with the found tenant
      const loginResult = await this.login(loginDto, user.tenant.id, ipAddress, userAgent);

      // Add tenant information to the response for public login
      return {
        ...loginResult,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain,
          plan: user.tenant.plan,
          status: user.tenant.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `Public login failed for ${loginDto.email}: ${error.message}`,
        error.stack,
        'Authentication',
        { email: loginDto.email, ipAddress, userAgent }
      );
      throw error;
    }
  }

  async login(loginDto: LoginDto, tenantId: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const logContext = { tenantId, ipAddress, userAgent };

    this.logger.debug(
      `Login attempt for email: ${loginDto.email}`,
      'Authentication',
      { ...logContext, email: loginDto.email }
    );

    try {
      const user = await this.validateUser(loginDto.email, loginDto.password, tenantId);

      if (!user) {
        this.logger.logAuthenticationEvent(
          `Failed login attempt - invalid credentials for ${loginDto.email}`,
          false,
          undefined,
          { ...logContext, email: loginDto.email, reason: 'invalid_credentials' }
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.status !== UserStatus.ACTIVE) {
        this.logger.logAuthenticationEvent(
          `Failed login attempt - inactive account for ${loginDto.email}`,
          false,
          user.id,
          { ...logContext, email: loginDto.email, reason: 'inactive_account', userStatus: user.status }
        );
        throw new UnauthorizedException('Account is not active');
      }

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Log successful login
      this.logger.logAuthenticationEvent(
        `Successful login for user ${user.email}`,
        true,
        user.id,
        {
          ...logContext,
          email: user.email,
          role: user.role,
          lastLoginAt: user.lastLoginAt
        }
      );

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        // Log security event for repeated failed attempts
        this.logger.logSecurityEvent(
          `Authentication failure for ${loginDto.email}`,
          {
            eventType: 'authentication_failure',
            severity: 'medium',
            description: `Failed login attempt for email: ${loginDto.email}`,
            ipAddress,
            userAgent,
            metadata: { email: loginDto.email, tenantId }
          },
          logContext
        );
      }
      throw error;
    }
  }

  async validateUser(email: string, password: string, tenantId: string): Promise<User | null> {
    // Validate email format first
    if (!this.owaspSecurityService.validateEmail(email)) {
      this.owaspSecurityService.logSecurityEvent(
        'Invalid email format in login attempt',
        { email, tenantId },
        'medium'
      );
      return null;
    }

    const user = await this.userRepository.findOne({
      where: { email, tenantId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'passwordHash', 'tenantId'],
    });

    if (user && (await this.owaspSecurityService.verifyPassword(password, user.passwordHash))) {
      return user;
    }

    return null;
  }

  async validateUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
      relations: ['tenant'],
    });
  }

  async refreshToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const logContext = { ipAddress, userAgent };

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.validateUserById(payload.sub);
      if (!user) {
        this.logger.logSecurityEvent(
          'Invalid refresh token used',
          {
            eventType: 'invalid_token',
            severity: 'medium',
            description: 'Attempt to use invalid refresh token',
            ipAddress,
            userAgent,
            metadata: { tokenPayload: payload }
          },
          { ...logContext, tenantId: payload.tenantId }
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      this.logger.logAuthenticationEvent(
        `Token refresh successful for user ${user.email}`,
        true,
        user.id,
        {
          ...logContext,
          tenantId: user.tenantId,
          email: user.email,
          refreshTime: new Date().toISOString()
        }
      );

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      this.logger.logSecurityEvent(
        'Token refresh failed',
        {
          eventType: 'token_refresh_failure',
          severity: 'medium',
          description: `Token refresh failed: ${error.message}`,
          ipAddress,
          userAgent,
          metadata: { error: error.message }
        },
        logContext
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, tenantId?: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const logContext = { tenantId, userId, ipAddress, userAgent };

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      // In a production environment, you might want to blacklist the token
      // For now, we'll just update the user's last activity
      await this.userRepository.update(userId, {
        updatedAt: new Date(),
      });

      this.logger.logAuthenticationEvent(
        `User logout successful for ${user?.email || userId}`,
        true,
        userId,
        {
          ...logContext,
          email: user?.email,
          logoutTime: new Date().toISOString()
        }
      );
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}: ${error.message}`,
        error.stack,
        'Authentication',
        logContext
      );
      throw error;
    }
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async publicRegister(registerDto: RegisterDto & { organizationName: string; organizationType?: string; industry?: string; website?: string; description?: string }): Promise<AuthResponse> {
    this.logger.debug(
      `Public registration attempt for email: ${registerDto.email}`,
      'Authentication',
      { email: registerDto.email }
    );

    try {
      // Check if user already exists globally
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        this.logger.logSecurityEvent(
          `Public registration attempt with existing email: ${registerDto.email}`,
          {
            eventType: 'duplicate_registration',
            severity: 'low',
            description: `Attempted registration with existing email: ${registerDto.email}`,
            metadata: { email: registerDto.email }
          }
        );
        throw new ConflictException('User with this email already exists');
      }

      // Generate subdomain from organization name
      const subdomain = this.generateSubdomain(registerDto.organizationName);

      // Check if subdomain already exists
      const existingTenant = await this.tenantRepository.findOne({
        where: { subdomain },
      });

      if (existingTenant) {
        throw new ConflictException('Organization name already taken. Please choose a different name.');
      }

      // Create tenant first
      const tenant = this.tenantRepository.create({
        name: registerDto.organizationName,
        subdomain,
        description: registerDto.description,
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.STARTER,
        apiKey: this.generateApiKey(),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        limits: this.getDefaultLimits(TenantPlan.STARTER),
        settings: {
          organizationType: registerDto.organizationType,
          industry: registerDto.industry,
          website: registerDto.website,
        },
      });

      const savedTenant = await this.tenantRepository.save(tenant);

      // Validate password strength
      const passwordValidation = this.owaspSecurityService.validatePasswordStrength(registerDto.password);
      if (!passwordValidation.valid) {
        this.logger.warn(
          `Password validation failed for public registration: ${registerDto.email}`,
          'Authentication',
          { email: registerDto.email, issues: passwordValidation.issues }
        );
        throw new BadRequestException(`Password does not meet security requirements: ${passwordValidation.issues.join(', ')}`);
      }

      // Hash password using OWASP security service
      const passwordHash = await this.owaspSecurityService.hashPassword(registerDto.password);

      // Create user as tenant admin
      const user = this.userRepository.create({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phoneNumber: registerDto.phoneNumber,
        passwordHash,
        tenantId: savedTenant.id,
        role: UserRole.TENANT_ADMIN, // First user is always tenant admin
        status: UserStatus.ACTIVE, // Auto-activate for public registration
        timezone: registerDto.timezone || 'UTC',
      });

      const savedUser = await this.userRepository.save(user);

      // Generate tokens
      const tokens = await this.generateTokens(savedUser);

      // Log successful registration
      this.logger.logAuthenticationEvent(
        `Public registration successful for ${savedUser.email}`,
        true,
        savedUser.id,
        {
          email: savedUser.email,
          role: savedUser.role,
          status: savedUser.status,
          tenantId: savedTenant.id,
          organizationName: registerDto.organizationName
        }
      );

      this.logger.logBusinessEvent(
        `New organization registered: ${registerDto.organizationName}`,
        'organization_registration',
        'Tenant',
        savedTenant.id,
        { email: savedUser.email, organizationName: registerDto.organizationName }
      );

      return {
        user: this.sanitizeUser(savedUser),
        tenant: {
          id: savedTenant.id,
          name: savedTenant.name,
          subdomain: savedTenant.subdomain,
          plan: savedTenant.plan,
          trialEndsAt: savedTenant.trialEndsAt,
          apiKey: savedTenant.apiKey,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(
        `Public registration failed for ${registerDto.email}: ${error.message}`,
        error.stack,
        'Authentication',
        { email: registerDto.email }
      );
      throw error;
    }
  }

  private generateSubdomain(organizationName: string): string {
    // Convert to lowercase, replace spaces and special chars with hyphens
    let subdomain = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Ensure it's at least 3 characters
    if (subdomain.length < 3) {
      subdomain = `org-${crypto.randomBytes(4).toString('hex')}`;
    }

    // Ensure it's not too long
    if (subdomain.length > 50) {
      subdomain = subdomain.substring(0, 50);
    }

    return subdomain;
  }

  private generateApiKey(): string {
    // Generate 30 random bytes (60 hex chars) + 'pk_' prefix = 63 chars total (within 64 limit)
    return `pk_${crypto.randomBytes(30).toString('hex')}`;
  }

  private getDefaultLimits(plan: TenantPlan) {
    const limits = {
      [TenantPlan.STARTER]: {
        maxUsers: 5,
        maxMerchants: 10,
        maxTransactionsPerMonth: 1000,
        maxApiCallsPerMinute: 100,
      },
      [TenantPlan.PROFESSIONAL]: {
        maxUsers: 25,
        maxMerchants: 100,
        maxTransactionsPerMonth: 10000,
        maxApiCallsPerMinute: 500,
      },
      [TenantPlan.ENTERPRISE]: {
        maxUsers: -1, // unlimited
        maxMerchants: -1,
        maxTransactionsPerMonth: -1,
        maxApiCallsPerMinute: 1000,
      },
    };

    return limits[plan];
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async debugListUsers() {
    const users = await this.userRepository.find({
      relations: ['tenant'],
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'createdAt'],
    });

    const tenants = await this.tenantRepository.find({
      select: ['id', 'name', 'subdomain', 'status', 'createdAt'],
    });

    return {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain,
          status: user.tenant.status,
        } : null,
      })),
      tenants: tenants,
      totalUsers: users.length,
      totalTenants: tenants.length,
    };
  }
}
