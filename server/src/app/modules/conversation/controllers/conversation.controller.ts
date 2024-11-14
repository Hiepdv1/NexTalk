import { Body, Controller, NotFoundException, Post, Req } from '@nestjs/common';
import { IConversationDto } from '../dto/conversation.dto';
import { Request } from 'express';
import { AuthService } from '../../auth/services/auth.service';
import { ConversationService } from '../services/conversation.service';
import { MemberService } from '../../members/services/member.service';

@Controller('/conversations')
export class ConversationController {
  private readonly MESSAGE_BATCH: number = 12;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly memberService: MemberService
  ) {}

  @Post('/get-or-create-conversation')
  public async getOrCreateConversation(
    @Body() data: IConversationDto,
    @Req() req: Request
  ) {
    const profile = await this.authService.findUserById(req.userId);
    if (!profile) throw new NotFoundException('The user does not exist');

    const member = await this.memberService.getCurrentMemberInServer(
      profile.id,
      data.serverId
    );

    const conversation = await this.conversationService.getOrCreateConversation(
      member.id,
      data.participantId
    );

    return conversation;
  }
}
