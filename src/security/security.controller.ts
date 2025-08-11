import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SecurityService } from './security.service';
import { PciComplianceService } from './services/pci-compliance.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Security')
@Controller('security')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly pciComplianceService: PciComplianceService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get security overview' })
  @ApiResponse({ status: 200, description: 'Security overview retrieved successfully' })
  getSecurityOverview(@TenantId() tenantId: string) {
    return this.securityService.getSecurityOverview(tenantId);
  }

  @Get('compliance/pci')
  @ApiOperation({ summary: 'Get PCI DSS compliance report' })
  @ApiResponse({ status: 200, description: 'PCI compliance report generated successfully' })
  getPciComplianceReport(@TenantId() tenantId: string) {
    return this.pciComplianceService.generateComplianceReport(tenantId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics' })
  @ApiResponse({ status: 200, description: 'Security metrics retrieved successfully' })
  getSecurityMetrics(@TenantId() tenantId: string) {
    return this.pciComplianceService.getSecurityMetrics(tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get security alerts' })
  @ApiResponse({ status: 200, description: 'Security alerts retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of alerts to return' })
  async getSecurityAlerts(
    @TenantId() tenantId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // For now, return mock security alerts data
    // In a real implementation, this would fetch from a security alerts service
    const mockAlerts = [
      {
        id: '1',
        type: 'suspicious_activity',
        severity: 'medium',
        title: 'Multiple failed login attempts',
        description: 'User attempted to login 5 times with incorrect credentials',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'open',
        source: 'authentication_system',
      },
      {
        id: '2',
        type: 'unauthorized_access',
        severity: 'high',
        title: 'Access attempt from blocked IP',
        description: 'Login attempt from IP address in security blacklist',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        status: 'investigating',
        source: 'firewall',
      },
      {
        id: '3',
        type: 'data_anomaly',
        severity: 'low',
        title: 'Unusual transaction pattern detected',
        description: 'Transaction volume 20% higher than normal for this time period',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        status: 'resolved',
        source: 'fraud_detection',
      },
    ];

    return {
      data: mockAlerts.slice(0, limit),
      total: mockAlerts.length,
      limit,
    };
  }

  @Post('scan')
  @ApiOperation({ summary: 'Initiate security scan' })
  @ApiResponse({ status: 201, description: 'Security scan initiated successfully' })
  initiateScan(
    @TenantId() tenantId: string,
    @Body('scanType') scanType: 'vulnerability' | 'penetration' | 'compliance',
  ) {
    return this.pciComplianceService.performSecurityScan(tenantId, scanType);
  }
}
