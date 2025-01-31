import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import prismaExtensions from './prisma-extensions';

@Injectable()
export class PostgresDatabaseProviderService
  extends PrismaClient
  implements OnModuleInit
{
  private keepAliveInterval: NodeJS.Timeout;
  private readonly logger = new Logger();

  constructor() {
    super();
  }

  async onModuleInit() {
    const extendedPrismaClient = this.createExtendedPrismaClient();

    Object.assign(this, extendedPrismaClient);

    await this.$connect();
    this.startKeepAlive();
    this.logger.debug('Database initialized!');
  }

  private startKeepAlive() {
    this.keepAliveInterval = setInterval(
      async () => {
        try {
          await this.$queryRaw`SELECT 1`;
          console.log('Keep-alive ping to database');
        } catch (error) {
          console.error('Error during keep-alive ping:', error);
        }
      },
      3 * 60 * 1000
    );
  }

  private createExtendedPrismaClient(): PrismaClient {
    return new PrismaClient().$extends(prismaExtensions) as PrismaClient;
  }

  async onModuleDestroy() {
    clearInterval(this.keepAliveInterval);
    await this.$disconnect();
  }
}
