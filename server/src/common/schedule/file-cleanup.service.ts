import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StorageType } from '@prisma/client';
import { CloudinaryService } from '@src/configs/storage/cloudianry/cloudinary.service';
import { DropboxService } from '@src/configs/storage/dropbox/dropbox.service';
import { PostgresDatabaseProviderService } from '@src/providers/database/postgres/provider.service';

@Injectable()
export class FileCleanupService implements OnModuleInit {
  private readonly logger = new Logger();
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly db: PostgresDatabaseProviderService,
    private readonly dropboxService: DropboxService,
    private readonly cloudinaryService: CloudinaryService
  ) {}
  async onModuleInit() {
    this.logger.debug(
      'Initializing server and starting file cleanup process...'
    );

    try {
      const totalFiles = await this.db.tempStoreFile.count();
      this.logger.debug(`Found ${totalFiles} files to delete during startup.`);

      if (totalFiles > 0) {
        const totalSuccessfullyDeletedIds = await this.handleFilesDeleted();
        this.logger.debug(
          `Startup file cleanup completed. Deleted ${totalSuccessfullyDeletedIds} files.`
        );
      } else {
        this.logger.debug('No files to delete during startup.');
      }
    } catch (error) {
      this.logger.error(
        'An error occurred during the startup file cleanup process.',
        error.stack
      );
    }
  }

  private async handleFilesDeleted() {
    const totalFiles = await this.db.tempStoreFile.count();

    if (totalFiles === 0) {
      this.logger.debug('No files to delete.');
      return;
    }

    this.logger.debug(
      `Found ${totalFiles} files to delete. Starting batch processing...`
    );

    let offset = 0;
    let totalSuccessfullyDeletedIds: number = 0;

    while (true) {
      const filesDeleted = await this.db.tempStoreFile.findMany({
        skip: offset,
        take: this.BATCH_SIZE,
      });

      if (filesDeleted.length === 0) break;

      const promisesFileDeleted: { id: string; status: Promise<any> }[] = [];

      for (const fileInfo of filesDeleted) {
        if (fileInfo.storageType === StorageType.CLOUDINARY) {
          promisesFileDeleted.push({
            id: fileInfo.id,
            status: this.cloudinaryService.Destroy(
              fileInfo.fileId,
              fileInfo.messageType.toLocaleLowerCase()
            ),
          });
        } else if (fileInfo.storageType === StorageType.DROPBOX) {
          promisesFileDeleted.push({
            id: fileInfo.id,
            status: this.dropboxService.deleteFile(fileInfo.fileId),
          });
        }
      }

      const results = await Promise.allSettled(
        promisesFileDeleted.map((p) => p.status)
      );

      const successfullyDeletedIds = promisesFileDeleted
        .filter((_, index) => results[index].status === 'fulfilled')
        .map((file) => file.id);

      if (successfullyDeletedIds.length > 0) {
        await this.db.tempStoreFile.deleteMany({
          where: {
            id: {
              in: successfullyDeletedIds,
            },
          },
        });
      }

      this.logger.debug(
        `Batch processed: Successfully deleted ${successfullyDeletedIds.length} files. Offset: ${offset}`
      );

      offset += filesDeleted.length;
      totalSuccessfullyDeletedIds += successfullyDeletedIds.length;
    }

    return totalSuccessfullyDeletedIds;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async handleCron() {
    this.logger.debug('Running file cleanup task at midnight...');
    const totalSuccessfullyDeletedIds = await this.handleFilesDeleted();
    this.logger.debug('Midnight cleanup task completed.');
    this.logger.debug(
      `file cleanup completed. Deleted ${totalSuccessfullyDeletedIds} files.`
    );
  }
}
