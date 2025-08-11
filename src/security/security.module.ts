import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { EncryptionService } from './services/encryption.service';
import { PciComplianceService } from './services/pci-compliance.service';
import { SecurityAuditService } from './services/security-audit.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    EncryptionService,
    PciComplianceService,
    SecurityAuditService,
  ],
  exports: [SecurityService, EncryptionService, PciComplianceService],
})
export class SecurityModule {}
