import { Injectable } from '@nestjs/common';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class MemberService {
  constructor(private readonly db: PostgresDatabaseProviderService) {}

  public async getCurrentMemberInServer(profileId: string, serverId: string) {
    const member = await this.db.member.findFirst({
      where: {
        profileId,
        serverId,
      },
      include: {
        profile: true,
      },
    });

    return member;
  }
}
