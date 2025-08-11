import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(tenantId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, tenantId },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);

    // Prevent users from updating their own role unless they're super admin
    if (updateUserDto.role && user.role !== 'super_admin') {
      throw new ForbiddenException('Cannot update role');
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.findOne(id, tenantId);
    await this.userRepository.softDelete(id);
  }

  async activate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    return await this.userRepository.save(user);
  }

  async deactivate(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = UserStatus.INACTIVE;
    return await this.userRepository.save(user);
  }

  async suspend(id: string, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    user.status = UserStatus.SUSPENDED;
    return await this.userRepository.save(user);
  }
}
