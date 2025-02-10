import { Controller, Get, NotFoundException, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelReadService } from '../services/channelRead.service';
import { Request } from 'express';
import { AuthService } from '../../auth/services/auth.service';

@Controller('/channel-notifications')
export class ChannlReadController {
  constructor(
    private readonly configService: ConfigService,
    private readonly channelReadService: ChannelReadService,
    private readonly authService: AuthService
  ) {}

  @Get('/')
  public async getNotifications(@Req() req: Request) {
    const userId = req.userId;

    const profile = await this.authService.findUserById(userId);

    if (!profile) {
      throw new NotFoundException('Unauthorized user');
    }

    const notifications =
      await this.channelReadService.getChannelReadByProfleId(profile.id);

    return notifications;
  }
}
