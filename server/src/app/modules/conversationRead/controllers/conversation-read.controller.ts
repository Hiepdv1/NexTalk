import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { ConversationReadService } from '../services/conversation-read.services';
import { MemberService } from '../../members/services/member.service';

@Controller('/conversation-notifications')
export class ConversationReadController {
  constructor(
    private readonly conversationReadServices: ConversationReadService,
    private readonly memberService: MemberService
  ) {}

  @Get('/')
  public async getNotifications(@Req() req: Request) {
    const userId = req.userId;

    const member = await this.memberService.getMemberByUserId(userId);

    if (!member) {
      return [];
    }

    const notifications = await this.conversationReadServices.getConversations(
      member.id
    );

    return notifications;
  }
}
