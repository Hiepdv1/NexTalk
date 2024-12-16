import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PostgresDatabaseProviderService
  extends PrismaClient
  implements OnModuleInit
{
  private keepAliveInterval: NodeJS.Timeout;

  async onModuleInit() {
    await this.$connect();
    this.startKeepAlive();
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

  async onModuleDestroy() {
    clearInterval(this.keepAliveInterval);
    await this.$disconnect();
  }
}
