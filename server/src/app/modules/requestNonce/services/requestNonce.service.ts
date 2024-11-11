import { Inject, Injectable, Logger } from '@nestjs/common';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';
import { CreateRequestNonceDto } from '../dto/requestNonce.dto';
import { RequestNonce } from '../entities/requestNonce.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RequestNonceService {
  private readonly logger = new Logger();

  constructor(
    private readonly db: PostgresDatabaseProviderService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async onModuleInit() {
    await this.deleteExpiredNonces(new Date());
    this.logger.debug('Deleted expired nonces on startup');
  }

  async findOneByProps(nonce: string): Promise<RequestNonce | null> {
    return this.db.requestNonce.findFirst({
      where: {
        nonce,
      },
    });
  }

  private async deleteExpiredNonces(currentTime: Date) {
    this.logger.debug(`Deleting expired nonces at ${currentTime}`);
    return this.db.requestNonce.deleteMany({
      where: { expiresAt: { lt: currentTime } },
    });
  }

  async create(
    createRequestNonceDto: CreateRequestNonceDto
  ): Promise<RequestNonce> {
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000);
    return await this.db.requestNonce.create({
      data: { ...createRequestNonceDto, expiresAt },
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    await this.deleteExpiredNonces(new Date());
    this.logger.debug('Cron Job: Cleaned expired nonces');
  }
}
