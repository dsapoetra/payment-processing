import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key || key.length < this.keyLength) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    this.encryptionKey = Buffer.from(key.substring(0, this.keyLength), 'utf8');
  }

  /**
   * Encrypt sensitive data (PCI DSS requirement)
   */
  encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      cipher.setAAD(Buffer.from('payment-processing', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      const iv = combined.subarray(0, this.ivLength);
      const tag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAAD(Buffer.from('payment-processing', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, hash] = hashedData.split(':');
      const newHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
      return hash === newHash.toString('hex');
    } catch (error) {
      return false;
    }
  }

  /**
   * Mask sensitive data for display (PCI DSS requirement)
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) {
      return '****';
    }
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4) + last4;
    return masked;
  }

  /**
   * Mask email address
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '****@****.***';
    }
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : '**';
    const [domainName, tld] = domain.split('.');
    const maskedDomain = domainName.length > 2
      ? domainName.substring(0, 2) + '*'.repeat(domainName.length - 2)
      : '**';
    return `${maskedUsername}@${maskedDomain}.${tld}`;
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(24).toString('hex');
    return `pk_${timestamp}_${random}`;
  }

  /**
   * Validate data integrity using HMAC
   */
  generateHmac(data: string, secret?: string): string {
    const actualSecret = secret || this.encryptionKey.toString('hex');
    return crypto.createHmac('sha256', actualSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmac(data: string, signature: string, secret?: string): boolean {
    const actualSecret = secret || this.encryptionKey.toString('hex');
    const expectedSignature = crypto.createHmac('sha256', actualSecret).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  }

  /**
   * Secure data wiping (overwrite memory)
   */
  secureWipe(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      crypto.randomFillSync(buffer);
      buffer.fill(0);
    }
  }
}
