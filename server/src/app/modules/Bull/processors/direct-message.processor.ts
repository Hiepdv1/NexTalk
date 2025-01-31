import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from '@src/providers/database/postgres/provider.service';
import { Job } from 'bullmq';

@Processor('DirectMessage', {
  concurrency: parseInt(process.env.MAX_CONCURRENCIES),
})
export class DirectMessageProcessor extends WorkerHost {
  private readonly logger = new Logger();

  constructor(private readonly db: PostgresDatabaseProviderService) {
    super();
  }

  private async handleCreateMessage({
    values,
  }: {
    values: Prisma.DirectMessageCreateManyInput;
  }) {
    return await this.db.directMessage.create({
      data: {
        ...values,
      },
    });
  }

  public async process(job: Job) {
    const data = job.data;

    await this.handleCreateMessage(data);
  }

  @OnWorkerEvent('completed')
  public async onCompleted(job: Job) {
    this.logger.debug(`Job with id - ${job.id} - has been completed`);
  }

  @OnWorkerEvent('active')
  public async onActive(job: Job) {
    this.logger.debug('Got a new job with id: ', job.id);
  }

  @OnWorkerEvent('failed')
  public async onFailed(job: Job, err: Error) {
    this.logger.error(`Job with id - ${job.id} - has failed`);
    this.logger.error(`Attempt number: ${job.attemptsMade}`);
    this.logger.error(`Failed reason: ${job.failedReason}`);
    if (err) {
      this.logger.error(`Error message: ${err.message}`);
      this.logger.error(`Stack trace: ${err.stack}`);
    }
    if (job.stacktrace && job.stacktrace.length > 0) {
      this.logger.error(`Job stacktrace:`);
      job.stacktrace.forEach((trace, index) => {
        this.logger.error(`[${index + 1}] ${trace}`);
      });
    }
  }
}
