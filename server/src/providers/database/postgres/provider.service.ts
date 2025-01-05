import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient, MessageType } from '@prisma/client';

@Injectable()
export class PostgresDatabaseProviderService
  extends PrismaClient
  implements OnModuleInit
{
  private keepAliveInterval: NodeJS.Timeout;

  protected setUpCreatedMesageValidate() {
    return this.$extends({
      model: {
        message: {
          async createWithValidation(
            data: Prisma.MessageCreateManyInput | Prisma.MessageCreateInput
          ) {
            if (
              (data.type === MessageType.FILE ||
                data.type === MessageType.VIDEO) &&
              !data.storageType
            ) {
              throw new BadRequestException(
                'storageType is required when type is FILE or VIDEO'
              );
            }

            return this.create(data);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.setUpCreatedMesageValidate();
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
