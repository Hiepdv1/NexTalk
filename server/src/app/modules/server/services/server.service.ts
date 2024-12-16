import { Injectable } from '@nestjs/common';
import { MemberRole, Prisma } from '@prisma/client';
import { v4 as genuid } from 'uuid';

import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class ServerService {
  constructor(
    private readonly databaseService: PostgresDatabaseProviderService
  ) {}

  public async getServerWithMemebers(serverId: string, profileId: string) {
    return await this.databaseService.server.findFirst({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
          },
        },
      },
      include: {
        members: true,
      },
    });
  }

  async createServer(data: Prisma.ServerCreateManyInput) {
    const server = this.databaseService.server.create({
      data: {
        profileId: data.profileId,
        name: data.name,
        imageUrl: data.imageUrl,
        inviteCode: data.inviteCode,
        cloudId: data.cloudId,
        channels: {
          create: [
            {
              name: 'general',
              profileId: data.profileId,
            },
          ],
        },
        members: {
          create: [
            {
              profileId: data.profileId,
              role: MemberRole.ADMIN,
            },
          ],
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            profile: true,
            conversationsInitiated: {
              take: 12,
            },
            conversationsReceived: {
              take: 12,
            },
          },
        },
      },
    });

    return server;
  }

  public async updatedServer(serverId: string, data: Prisma.ServerUpdateInput) {
    const serverUpdated = await this.databaseService.server.update({
      where: {
        id: serverId,
      },
      data: {
        ...data,
      },
    });

    return serverUpdated;
  }

  public async findAllServers(profileId: string) {
    return this.databaseService.server.findMany({
      where: {
        members: {
          some: {
            profileId,
          },
        },
      },
    });
  }

  public async GetServers(
    profileId: string,
    {
      limit,
      offset,
      startedId,
    }: { limit?: number; offset?: number; startedId?: string }
  ) {
    const [count, servers] = await this.databaseService.$transaction([
      this.databaseService.server.count({
        where: { members: { some: { profileId } } },
      }),
      this.databaseService.server.findMany({
        where: {
          members: {
            some: {
              profileId,
            },
          },
        },
        include: {
          channels: {
            include: {
              messages: {
                include: {
                  member: {
                    include: {
                      profile: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 12,
              },
            },
          },
          members: {
            include: {
              profile: true,
              directMessages: true,
              conversationsInitiated: {
                include: {
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
                take: 12,
              },
              conversationsReceived: {
                include: {
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
                take: 12,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 12,
          },
        },
        take: limit ?? 12,
        skip: offset ?? 0,
        ...(startedId ? { cursor: { id: startedId } } : {}),
      }),
    ]);

    return {
      count,
      servers,
    };
  }

  public async GetFirstServer(profileId: string) {
    const firstServer = this.databaseService.server.findFirst({
      where: {
        OR: [
          {
            profileId,
          },
          {
            members: {
              some: {
                profileId,
              },
            },
          },
        ],
      },
    });

    return firstServer;
  }

  public async getServerById(serverId: string) {
    return await this.databaseService.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        channels: true,
        members: {
          include: {
            profile: true,
            conversationsInitiated: true,
            conversationsReceived: true,
          },
          take: 12,
        },
      },
    });
  }

  public async GetServerProfileById(serverId: string, profileId: string) {
    const server = this.databaseService.server.findUnique({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
          },
        },
      },
    });

    return server;
  }

  public async GetServerByInviteCode(inviteCode: string) {
    const server = this.databaseService.server.findUnique({
      where: {
        inviteCode,
      },
      include: {
        members: true,
      },
    });

    return await server;
  }

  public async GetServerById(serverId: string) {
    const server = this.databaseService.server.findUnique({
      where: {
        id: serverId,
      },
    });

    return server;
  }

  async GetServerChannels(serverId: string) {
    const server = this.databaseService.server.findUnique({
      where: {
        id: serverId,
      },
      include: {
        channels: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return server;
  }

  async GenerateNewInviteCode(serverId: string, profileId: string) {
    const server = this.databaseService.server.update({
      where: {
        id: serverId,
        profileId,
      },
      data: {
        inviteCode: genuid(),
      },
    });

    return server;
  }

  async GetServerWithMembersByInviteCode(
    inviteCode: string,
    profileId: string
  ) {
    const server = await this.databaseService.server.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!server) return null;

    const isMember = server.members.some(
      (member) => member.profileId === profileId
    );

    return {
      server,
      members: server.members,
      isMember,
    };
  }

  public async UpdateMemberRoleInServer(
    serverId: string,
    profileId: string,
    memberId: string,
    role: MemberRole
  ) {
    const updatedServer = await this.databaseService.server.update({
      where: {
        id: serverId,
        profileId,
      },
      data: {
        members: {
          update: {
            where: {
              id: memberId,
              profileId: {
                not: profileId,
              },
            },
            data: {
              role,
            },
          },
        },
      },
      include: {
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    return updatedServer;
  }

  public async DeleteMemberInServer(
    serverId: string,
    profileId: string,
    memberId: string
  ) {
    const updatedServer = await this.databaseService.server.update({
      where: {
        id: serverId,
        profileId,
      },
      data: {
        members: {
          delete: {
            id: memberId,
            profileId: {
              not: profileId,
            },
          },
        },
      },
      include: {
        members: {
          include: {
            profile: true,
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    return updatedServer;
  }

  public async AddMemberToServerByInviteCode(
    inviteCode: string,
    profileId: string
  ) {
    const server = this.databaseService.server.update({
      where: {
        inviteCode,
      },
      data: {
        members: {
          create: [
            {
              profileId,
            },
          ],
        },
      },
      include: {
        channels: {
          include: {
            messages: {
              include: {
                member: {
                  include: {
                    profile: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 12,
            },
          },
        },
        members: {
          include: {
            profile: true,
            conversationsInitiated: {
              include: {
                directMessages: true,
              },
              take: 12,
            },
            conversationsReceived: {
              include: {
                directMessages: true,
              },
              take: 12,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 12,
        },
      },
    });

    return await server;
  }

  public async LeaveServer(serverId: string, profileId: string) {
    const server = await this.databaseService.server.update({
      where: {
        id: serverId,
        profileId: {
          not: profileId,
        },
        members: {
          some: {
            profileId,
          },
        },
      },
      data: {
        members: {
          deleteMany: {
            profileId,
          },
        },
      },
    });

    return server;
  }

  public async DeleteServer(profileId: string, serverId: string) {
    const server = await this.databaseService.server.delete({
      where: {
        id: serverId,
        profileId,
      },
    });

    return server;
  }

  public async getServerDetails(serverId: string, profileId: string) {
    const server = await this.databaseService.server.findUnique({
      where: {
        id: serverId,
        members: {
          some: {
            profileId,
          },
        },
      },
      include: {
        channels: {
          where: {
            name: 'general',
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return server;
  }
}
