import { Module } from '@nestjs/common';
import { WebRtcService } from './services/webRtc.service';

@Module({
  providers: [WebRtcService],
  exports: [WebRtcService],
})
export class WebRtcModule {}
