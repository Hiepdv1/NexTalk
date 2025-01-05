import { Module } from '@nestjs/common';
import { CloudinaryConfig } from './cloudinary.config';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryConfig, CloudinaryService],
  exports: [CloudinaryService],
})
export class NestCloudinaryClientModule {}
