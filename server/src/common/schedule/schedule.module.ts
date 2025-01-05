import { Module } from '@nestjs/common';
import { FileCleanupService } from './file-cleanup.service';
import { NestDropboxModule } from '@src/configs/storage/dropbox/dropbox.module';
import { NestCloudinaryClientModule } from '@src/configs/storage/cloudianry/cloudinary.module';
import { PostgresDatabaseProviderModule } from '@src/providers/database/postgres/provider.module';
@Module({
  imports: [
    NestDropboxModule,
    NestCloudinaryClientModule,
    PostgresDatabaseProviderModule,
  ],
  providers: [FileCleanupService],
  exports: [FileCleanupService],
})
export class TaskSchedulerModule {}
