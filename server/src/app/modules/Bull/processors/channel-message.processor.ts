import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma, StorageType } from '@prisma/client';
import { PostgresDatabaseProviderService } from '@src/providers/database/postgres/provider.service';

@Processor('ChannelMessage', {
  concurrency: parseInt(process.env.MAX_CONCURRENCIES, 10) || 5,
})
export class ChannelMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(ChannelMessageProcessor.name);

  constructor(private readonly db: PostgresDatabaseProviderService) {
    super();
  }

  private async handleCreateMessage({
    values,
    storageType,
  }: {
    values: Prisma.MessageCreateManyInput;
    storageType?: StorageType;
  }) {
    return await this.db.message.create({
      data: {
        ...values,
        storageType,
      },
    });
  }

  public async process(job: Job) {
    try {
      const data = job.data;
      await this.handleCreateMessage(data);
      this.logger.debug(`Job ${job.id} processed successfully.`);
    } catch (error) {
      this.logger.error(
        `Job ${job.id} processing failed: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  public async onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has been completed.`);
  }

  @OnWorkerEvent('active')
  public async onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active.`);
  }

  @OnWorkerEvent('failed')
  public async onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`
    );
    if (job.stacktrace && job.stacktrace.length > 0) {
      this.logger.error(`Stack trace:`);
      job.stacktrace.forEach((trace, index) => {
        this.logger.error(`[${index + 1}] ${trace}`);
      });
    }
  }
}
