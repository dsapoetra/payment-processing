import { Injectable } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { PciComplianceService } from './services/pci-compliance.service';

@Injectable()
export class SecurityService {
  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly pciComplianceService: PciComplianceService,
  ) {}

  async getSecurityOverview(tenantId: string) {
    const [complianceReport, securityMetrics] = await Promise.all([
      this.pciComplianceService.generateComplianceReport(tenantId),
      this.pciComplianceService.getSecurityMetrics(tenantId),
    ]);

    const complianceScore = this.calculateComplianceScore(complianceReport);

    return {
      complianceScore,
      complianceReport,
      securityMetrics,
      recommendations: this.getSecurityRecommendations(complianceReport, securityMetrics),
    };
  }

  private calculateComplianceScore(report: any[]): number {
    const compliant = report.filter(r => r.status === 'compliant').length;
    const total = report.length;
    return Math.round((compliant / total) * 100);
  }

  private getSecurityRecommendations(complianceReport: any[], securityMetrics: any): string[] {
    const recommendations: string[] = [];

    // Check compliance issues
    const nonCompliant = complianceReport.filter(r => r.status === 'non-compliant');
    if (nonCompliant.length > 0) {
      recommendations.push('Address non-compliant PCI DSS requirements immediately');
    }

    // Check vulnerability levels
    if (securityMetrics.vulnerabilities.critical > 0) {
      recommendations.push('Critical vulnerabilities detected - immediate remediation required');
    }

    if (securityMetrics.vulnerabilities.high > 5) {
      recommendations.push('High number of high-severity vulnerabilities - schedule remediation');
    }

    if (securityMetrics.complianceScore < 90) {
      recommendations.push('Compliance score below 90% - review security controls');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture is good - continue regular monitoring');
    }

    return recommendations;
  }
}
