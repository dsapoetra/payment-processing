import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Tenant, TenantStatus, TenantPlan } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if subdomain already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { subdomain: createTenantDto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain already exists');
    }

    // Generate API key
    const apiKey = this.generateApiKey();

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      apiKey,
      status: TenantStatus.ACTIVE,
      plan: createTenantDto.plan || TenantPlan.STARTER,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      limits: this.getDefaultLimits(createTenantDto.plan || TenantPlan.STARTER),
    });

    return await this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { subdomain, status: TenantStatus.ACTIVE },
    });
  }

  async findByApiKey(apiKey: string): Promise<Tenant | null> {
    return await this.tenantRepository.findOne({
      where: { apiKey, status: TenantStatus.ACTIVE },
    });
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check subdomain uniqueness if being updated
    if (updateTenantDto.subdomain && updateTenantDto.subdomain !== tenant.subdomain) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { subdomain: updateTenantDto.subdomain },
      });

      if (existingTenant) {
        throw new ConflictException('Subdomain already exists');
      }
    }

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.softDelete(id);
  }

  async regenerateApiKey(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.apiKey = this.generateApiKey();
    return await this.tenantRepository.save(tenant);
  }

  private generateApiKey(): string {
    return `pk_${crypto.randomBytes(32).toString('hex')}`;
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
}
