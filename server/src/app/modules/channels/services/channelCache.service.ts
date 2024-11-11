import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, Member } from '@prisma/client';
import type { Cache } from 'cache-manager';

@Injectable()
export class ChannelCacheService {
  private ttl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cachesManager: Cache,
    private readonly configService: ConfigService
  ) {
    this.ttl =
      Number.parseInt(configService.get<string>('CACHE_ASIDE_TTL')) || 3600000; // 1 hour by miliseconds
  }

  private getProfileKey(profileId: string) {
    return `PROFILE:${profileId}`;
  }

  private getChannelsKey(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
  }) {
    return `${this.getProfileKey(keys.profileId)}:SERVER:${keys.serverId}:CHANNELS`;
  }

  private getChannelMembersKey(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
  }) {
    return `${this.getProfileKey(keys.profileId)}:SERVER:${keys.serverId}:CHANNEL:${keys.channelId}:MEMBERS`;
  }

  public async getAllChannelsCache(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
  }): Promise<Array<Channel> | null> {
    const channelCache = (await this.cachesManager.get(
      this.getChannelsKey(keys)
    )) as any;

    if (channelCache) {
      return JSON.parse(channelCache);
    }

    return null;
  }

  public async getChannelCache(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
  }): Promise<Channel | null | undefined> {
    const channelsCache = await this.getAllChannelsCache(keys);

    console.log(channelsCache);
    if (channelsCache) {
      const channel = channelsCache.find(
        (channel) => channel.id === keys.channelId
      );

      return channel;
    }

    return null;
  }

  public async getAllChannelMembersCache(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
    memberId: string;
  }): Promise<Array<Member>> {
    const channelsCache = (await this.cachesManager.get(
      this.getChannelMembersKey(keys)
    )) as any;

    if (channelsCache) {
      return JSON.parse(channelsCache);
    }

    return null;
  }

  public async getChannelMember(keys: {
    profileId: string;
    serverId: string;
    channelId: string;
    memberId: string;
  }): Promise<Member | null | undefined> {
    const membersCache = await this.getAllChannelMembersCache(keys);

    if (membersCache) {
      const member = membersCache.find((member) => member.id === keys.memberId);
      return member;
    }

    return null;
  }

  public async setChannelMemberCache(
    keys: {
      profileId: string;
      serverId: string;
      channelId: string;
      memberId: string;
    },
    data: Member
  ) {
    const [membersCache, existingMember] = await Promise.all([
      this.getAllChannelMembersCache(keys),
      this.getChannelMember(keys),
    ]);
    const key = this.getChannelMembersKey(keys);

    if (membersCache && !existingMember) {
      membersCache.push(data);
      await this.cachesManager.set(key, JSON.stringify(membersCache), this.ttl);
      return;
    } else if (existingMember) {
      return;
    }

    await this.cachesManager.set(key, JSON.stringify([data]), this.ttl);
  }

  public async setChannelCache(
    keys: {
      profileId: string;
      serverId: string;
      channelId: string;
    },
    data: Channel
  ) {
    const [channelsCache, existingChannel] = await Promise.all([
      this.getAllChannelsCache(keys),
      this.getChannelCache(keys),
    ]);

    const key = this.getChannelsKey(keys);

    if (channelsCache && !existingChannel) {
      channelsCache.push(data);
      await this.cachesManager.set(
        key,
        JSON.stringify(channelsCache),
        this.ttl
      );
      return;
    } else if (existingChannel) {
      return;
    }
    await this.cachesManager.set(key, JSON.stringify([data]), this.ttl);
  }
}
