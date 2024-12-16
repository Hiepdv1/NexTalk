import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class ConversationService {
  private readonly MESSAGE_BATCH: number = 12;

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

  public async getOrCreateConversation(
    memberOneId: string,
    memberTwoId: string,
    id?: string
  ) {
    return await this.db.$transaction(async (prisma) => {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            {
              memberOneId,
              memberTwoId,
            },
            {
              memberOneId: memberTwoId,
              memberTwoId: memberOneId,
            },
          ],
        },
        include: {
          memberOne: true,
          memberTwo: true,
        },
      });

      if (existingConversation) {
        return existingConversation;
      }

      return await this.db.conversation.create({
        data: {
          id,
          memberOneId,
          memberTwoId,
        },
        include: {
          memberOne: true,
          memberTwo: true,
        },
      });
    });
  }

  public async getDirectMessageById({
    conversationId,
    skip,
    cursor,
  }: {
    conversationId: string;
    skip?: number;
    cursor?: string;
  }) {
    return await this.db.directMessage.findMany({
      where: {
        conversationId,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
      take: this.MESSAGE_BATCH,
      skip: skip ?? 1,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async createDirectMessage(data: Prisma.DirectMessageCreateManyInput) {
    return await this.db.directMessage.create({
      data: {
        content: data.content,
        memberId: data.memberId,
        conversationId: data.conversationId,
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  public async getConversationInServers(
    serverIds: string[],
    profileId: string
  ) {
    return this.db.conversation.findMany({
      where: {
        AND: [
          {
            memberOne: {
              serverId: {
                in: serverIds,
              },
            },
          },
          {
            memberTwo: {
              serverId: {
                in: serverIds,
              },
            },
          },
          {
            OR: [
              {
                memberOne: {
                  profileId,
                },
              },
              {
                memberTwo: {
                  profileId,
                },
              },
            ],
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
        directMessages: {
          include: {
            member: {
              include: {
                profile: true,
              },
            },
          },
          take: 12,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }
}
