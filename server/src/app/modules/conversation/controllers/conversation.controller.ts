import { Body, Controller, NotFoundException, Post, Req } from '@nestjs/common';

import { AuthService } from '../../auth/services/auth.service';
import { ConversationService } from '../services/conversation.service';
import { MemberService } from '../../members/services/member.service';
import { Request } from 'express';
import { ConversationCacheService } from '../services/conversationCache.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';

@Controller('/conversations')
export class ConversationController {
  private readonly MESSAGE_BATCH: number = 12;
  private readonly SECRET_KEY: string;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly conversationCacheService: ConversationCacheService,
    private readonly memberService: MemberService,
    private readonly configService: ConfigService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  @Post('/by-servers')
  public async getConversations(
    @Req() req: Request,
    @Body('serverIds') serverIds: string[]
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    const conversations =
      await this.conversationService.getConversationInServers(
        serverIds,
        profile.id
      );

    const conversationCache = conversations.map(async (con) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile: m1, ...restMemberOne } = con.memberOne;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile: m2, ...restMemberTwo } = con.memberTwo;

      const conversation = {
        ...con,
        memberOne: restMemberOne,
        memberTwo: restMemberTwo,
      };

      const conversationCache =
        (await this.conversationCacheService.getConversationCache({
          serverId: con.memberOne.serverId,
        })) || [];

      conversationCache.push(conversation);

      return await this.conversationCacheService.setAndOverrideConversationCache(
        { serverId: con.memberOne.serverId },
        conversationCache
      );
    });

    await Promise.all(conversationCache);

    return AppHelperService.encrypt(
      JSON.stringify(conversations),
      this.SECRET_KEY
    );
  }
}
