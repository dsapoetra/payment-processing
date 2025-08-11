import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  tenantId: string;
  iat?: number;
  exp?: number;
}
