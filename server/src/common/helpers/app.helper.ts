import * as crypto from 'crypto';
import { v4 as genuid } from 'uuid';

export class AppHelperService {
  static generateUUID(): string {
    return genuid();
  }

  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv
    );
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `${iv.toString('base64')}:${encrypted}`;
  }

  static decrypt(text: string, key: string): string {
    const [iv, encryptedText] = text.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'base64')
    );
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private static minutesToMilliseconds(minutes: number): number {
    return minutes * 60 * 1000;
  }

  static isWithinMinutesAfter(timestamp: number, minutes: number): boolean {
    const now: number = Date.now();
    return now - timestamp < AppHelperService.minutesToMilliseconds(minutes);
  }
}
