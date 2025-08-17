import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EnhancedThrottlerGuard, Throttle } from '../common/guards/enhanced-throttler.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PublicRegisterDto } from './dto/public-register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { ErrorResponseDto, SuccessResponseDto } from '../common/dto/api-response.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(EnhancedThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('public-register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: 3, medium: 10, long: 20 }) // Very restrictive for registration
  @ApiOperation({
    summary: 'Public registration - Create new organization and admin user',
    description: 'Creates a new tenant organization and the first admin user. This endpoint does not require an existing tenant context.',
  })
  @ApiBody({ type: PublicRegisterDto })
  @ApiCreatedResponse({
    description: 'Organization and user created successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['tenant_admin'] },
            status: { type: 'string', enum: ['active'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            subdomain: { type: 'string' },
            plan: { type: 'string', enum: ['starter', 'professional', 'enterprise'] },
            trialEndsAt: { type: 'string', format: 'date-time' },
            apiKey: { type: 'string', description: 'API key for tenant authentication' },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User or organization already exists',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts',
    type: ErrorResponseDto,
  })
  async publicRegister(@Body() publicRegisterDto: PublicRegisterDto) {
    return this.authService.publicRegister(publicRegisterDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account in the system. The user will be associated with the current tenant context.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['tenant_admin', 'merchant_admin', 'merchant_user', 'analyst', 'support'] },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_verification'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User already exists',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts',
    type: ErrorResponseDto,
  })
  async register(
    @Body() registerDto: RegisterDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.authService.register(registerDto, tenant.id);
  }

  @Post('public-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: 5, medium: 20, long: 50 }) // Restrictive for login attempts
  @ApiOperation({
    summary: 'Public login - Login with email and password',
    description: 'Authenticates a user by email and password without requiring tenant context. Automatically finds the user\'s tenant.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
          },
        },
        tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            subdomain: { type: 'string' },
            plan: { type: 'string' },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts',
    type: ErrorResponseDto,
  })
  async publicLogin(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.publicLogin(loginDto, ipAddress, userAgent);

    // Set HTTP-only cookie for server-side authentication
    response.cookie('authToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns access and refresh tokens. The user must belong to the current tenant.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'User logged in successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or user not found',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many login attempts',
    type: ErrorResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.authService.login(loginDto, tenant.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: 10, medium: 50, long: 200 }) // Moderate limits for token refresh
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many refresh attempts',
    type: ErrorResponseDto,
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Invalidates the current user session and refresh token.',
  })
  @ApiOkResponse({
    description: 'User logged out successfully',
    type: SuccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    // Clear the HTTP-only cookie
    response.clearCookie('authToken');

    return { message: 'Logged out successfully' };
  }

  @Post('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieves the profile information of the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string' },
        status: { type: 'string' },
        tenantId: { type: 'string', format: 'uuid' },
        lastLoginAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async getProfile(@CurrentUser() user: User) {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  @Get('debug/users')
  @ApiOperation({ summary: 'Debug: List all users (development only)' })
  async debugUsers() {
    return this.authService.debugListUsers();
  }
}
