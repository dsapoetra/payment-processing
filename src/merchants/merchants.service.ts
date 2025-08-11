import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Merchant,
  MerchantStatus,
  KYCStatus,
} from './entities/merchant.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createMerchantDto: CreateMerchantDto,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    // Check if merchant with same email already exists in tenant
    const existingMerchant = await this.merchantRepository.findOne({
      where: { email: createMerchantDto.email, tenantId },
    });

    if (existingMerchant) {
      throw new ConflictException('Merchant with this email already exists');
    }

    // Generate unique merchant ID
    const merchantId = await this.generateMerchantId();

    const merchant = this.merchantRepository.create({
      ...createMerchantDto,
      merchantId,
      tenantId,
      status: MerchantStatus.PENDING,
      kycStatus: KYCStatus.NOT_STARTED,
      createdBy: userId,
    });

    const savedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.CREATE,
      entityType: 'Merchant',
      entityId: savedMerchant.id,
      description: `Merchant ${merchantId} created`,
      tenantId,
      userId,
      metadata: {
        businessName: createMerchantDto.businessName,
        email: createMerchantDto.email,
      },
    });

    // Start KYC process automatically
    await this.startKycProcess(savedMerchant.id, tenantId, userId);

    return savedMerchant;
  }

  async findAll(tenantId: string): Promise<Merchant[]> {
    return await this.merchantRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({
      where: { id, tenantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async findByMerchantId(
    merchantId: string,
    tenantId: string,
  ): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({
      where: { merchantId, tenantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async update(
    id: string,
    updateMerchantDto: UpdateMerchantDto,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(id, tenantId);

    const oldValues = { ...merchant };
    Object.assign(merchant, updateMerchantDto);
    merchant.updatedBy = userId;

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `Merchant ${merchant.merchantId} updated`,
      oldValues,
      newValues: updateMerchantDto,
      tenantId,
      userId,
    });

    return updatedMerchant;
  }

  async remove(id: string, tenantId: string, userId?: string): Promise<void> {
    const merchant = await this.findOne(id, tenantId);

    await this.merchantRepository.softDelete(id);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.DELETE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `Merchant ${merchant.merchantId} deleted`,
      tenantId,
      userId,
    });
  }

  async startKycProcess(
    merchantId: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    merchant.kycStatus = KYCStatus.IN_PROGRESS;
    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `KYC process started for merchant ${merchant.merchantId}`,
      tenantId,
      userId,
      metadata: { kycStatus: KYCStatus.IN_PROGRESS },
    });

    // Simulate KYC verification process
    this.simulateKycVerification(merchantId, tenantId, userId);

    return updatedMerchant;
  }

  async uploadKycDocument(
    merchantId: string,
    documentType: string,
    documentUrl: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    if (!merchant.kycDocuments) {
      merchant.kycDocuments = {};
    }

    merchant.kycDocuments[documentType] = documentUrl;
    
    // Update KYC status if all required documents are uploaded
    const requiredDocs = ['businessLicense', 'taxCertificate', 'identityDocument'];
    const uploadedDocs = Object.keys(merchant.kycDocuments);
    const hasAllRequiredDocs = requiredDocs.every(doc => uploadedDocs.includes(doc));

    if (hasAllRequiredDocs && merchant.kycStatus === KYCStatus.IN_PROGRESS) {
      merchant.kycStatus = KYCStatus.PENDING_REVIEW;
    }

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.UPDATE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `KYC document ${documentType} uploaded for merchant ${merchant.merchantId}`,
      tenantId,
      userId,
      metadata: { documentType, documentUrl },
      isPciRelevant: true,
    });

    return updatedMerchant;
  }

  async approveKyc(
    merchantId: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    merchant.kycStatus = KYCStatus.APPROVED;
    merchant.status = MerchantStatus.APPROVED;
    merchant.approvedAt = new Date();

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.APPROVE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `KYC approved for merchant ${merchant.merchantId}`,
      tenantId,
      userId,
      metadata: { kycStatus: KYCStatus.APPROVED },
      isSecurityEvent: true,
    });

    return updatedMerchant;
  }

  async rejectKyc(
    merchantId: string,
    reason: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    merchant.kycStatus = KYCStatus.REJECTED;
    merchant.status = MerchantStatus.REJECTED;

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.REJECT,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `KYC rejected for merchant ${merchant.merchantId}: ${reason}`,
      tenantId,
      userId,
      metadata: { kycStatus: KYCStatus.REJECTED, reason },
      isSecurityEvent: true,
    });

    return updatedMerchant;
  }

  async activateMerchant(
    merchantId: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    if (merchant.kycStatus !== KYCStatus.APPROVED) {
      throw new BadRequestException('Merchant KYC must be approved before activation');
    }

    merchant.status = MerchantStatus.ACTIVE;
    merchant.isActive = true;

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.ACTIVATE,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `Merchant ${merchant.merchantId} activated`,
      tenantId,
      userId,
      metadata: { status: MerchantStatus.ACTIVE },
    });

    return updatedMerchant;
  }

  async suspendMerchant(
    merchantId: string,
    reason: string,
    tenantId: string,
    userId?: string,
  ): Promise<Merchant> {
    const merchant = await this.findOne(merchantId, tenantId);

    merchant.status = MerchantStatus.SUSPENDED;
    merchant.isActive = false;

    const updatedMerchant = await this.merchantRepository.save(merchant);

    // Log audit event
    await this.auditService.log({
      action: AuditAction.SUSPEND,
      entityType: 'Merchant',
      entityId: merchant.id,
      description: `Merchant ${merchant.merchantId} suspended: ${reason}`,
      tenantId,
      userId,
      metadata: { status: MerchantStatus.SUSPENDED, reason },
      isSecurityEvent: true,
    });

    return updatedMerchant;
  }

  private async generateMerchantId(): Promise<string> {
    let merchantId: string = '';
    let exists = true;

    while (exists) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      merchantId = `MER_${timestamp}_${random}`.toUpperCase();

      const existingMerchant = await this.merchantRepository.findOne({
        where: { merchantId },
      });
      exists = !!existingMerchant;
    }

    return merchantId;
  }

  private simulateKycVerification(
    merchantId: string,
    tenantId: string,
    userId?: string,
  ): void {
    // Simulate KYC verification delay
    const verificationDelay = this.configService.get('KYC_VERIFICATION_TIMEOUT', 300000);
    
    setTimeout(async () => {
      try {
        const merchant = await this.findOne(merchantId, tenantId);
        
        if (merchant.kycStatus === KYCStatus.IN_PROGRESS) {
          // Simulate 80% approval rate
          const isApproved = Math.random() < 0.8;
          
          if (isApproved) {
            await this.approveKyc(merchantId, tenantId, userId);
          } else {
            await this.rejectKyc(
              merchantId,
              'Insufficient documentation provided',
              tenantId,
              userId,
            );
          }
        }
      } catch (error) {
        console.error('KYC simulation error:', error);
      }
      },
      Math.min(verificationDelay, 10000),
    ); // Cap at 10 seconds for demo
  }
}
