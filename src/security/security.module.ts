import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { EncryptionService } from './services/encryption.service';
import { PciComplianceService } from './services/pci-compliance.service';
import { SecurityAuditService } from './services/security-audit.service';
import { OwaspSecurityService } from './services/owasp-security.service';
import { SecurityMiddleware } from './middleware/security.middleware';
import { SecurityValidationPipe } from './pipes/security-validation.pipe';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [SecurityController],
  providers: [
    SecurityService,
    EncryptionService,
    PciComplianceService,
    SecurityAuditService,
    OwaspSecurityService,
    SecurityMiddleware,
    SecurityValidationPipe,
  ],
  exports: [
    SecurityService,
    EncryptionService,
    PciComplianceService,
    OwaspSecurityService,
    SecurityMiddleware,
    SecurityValidationPipe,
  ],
})
export class SecurityModule {}
