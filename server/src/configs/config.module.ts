import { Module } from '@nestjs/common';
import { NestCloudinaryClientModule } from './storage/cloudianry/cloudinary.module';

@Module({
  imports: [NestCloudinaryClientModule],
})
export class AppConfigModule {}
