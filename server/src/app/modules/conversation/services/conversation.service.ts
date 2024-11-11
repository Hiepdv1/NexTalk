import { Injectable } from '@nestjs/common';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class ConversationService {
  constructor(private readonly db: PostgresDatabaseProviderService) {}

  public async getConversation(memberOneId: string, memberTwoId: string) {
    const conversation = await this.db.conversation.findFirst({
      where: {
        AND: [
          {
            memberOneId,
            memberTwoId,
          },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });

    return conversation;
  }

  public async createConversation(memberOneId: string, memberTwoId: string) {
    const conversation = await this.db.conversation.create({
      data: {
        memberOneId,
        memberTwoId,
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });

    return conversation;
  }

  public async getOrCreateConversation(
    memberOneId: string,
    memberTwoId: string
  ) {
    let conversation = await this.db.conversation.findFirst({
      where: {
        OR: [
          {
            memberOneId,
            memberTwoId,
          },
          {
            memberTwoId,
            memberOneId,
          },
        ],
      },
      include: {
        memberOne: {
          include: {
            profile: true,
          },
        },
        memberTwo: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!conversation) {
      conversation = await this.db.conversation.create({
        data: {
          memberOneId,
          memberTwoId,
        },
        include: {
          memberOne: {
            include: {
              profile: true,
            },
          },
          memberTwo: {
            include: {
              profile: true,
            },
          },
        },
      });
    }

    return conversation;
  }
}
