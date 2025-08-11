import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    console.log('=== ADMIN AUTH MIDDLEWARE ===');
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);

    // Only protect admin routes
    if (!req.url.includes('/admin')) {
      return next();
    }

    try {
      // Check for token in various places
      let token = this.extractTokenFromRequest(req);
      
      console.log('Token found:', !!token);

      if (!token) {
        console.log('No token found, redirecting to login');
        return this.redirectToLogin(res, req.url);
      }

      // Verify token
      const payload = this.jwtService.verify(token);
      console.log('Token payload:', { userId: payload.sub, email: payload.email });

      // Verify user still exists and is active
      const user = await this.usersService.findOne(payload.sub, payload.tenantId);
      if (!user || user.status !== 'active') {
        console.log('User not found or inactive, redirecting to login');
        return this.redirectToLogin(res, req.url);
      }

      console.log('Authentication successful, allowing access');
      next();

    } catch (error) {
      console.log('Authentication failed:', error.message);
      return this.redirectToLogin(res, req.url);
    }
  }

  private extractTokenFromRequest(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const cookies = req.headers.cookie;
    if (cookies) {
      const tokenMatch = cookies.match(/authToken=([^;]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }

    // Check query parameter (for testing)
    if (req.query.token) {
      return req.query.token as string;
    }

    return null;
  }

  private redirectToLogin(res: Response, originalUrl: string) {
    const loginUrl = `/ui/auth/login.html?redirect=${encodeURIComponent(originalUrl)}`;
    console.log('Redirecting to:', loginUrl);
    
    // Set cache control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.redirect(302, loginUrl);
  }
}
