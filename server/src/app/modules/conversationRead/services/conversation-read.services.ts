import { Injectable } from '@nestjs/common';
import { PostgresDatabaseProviderService } from '@src/providers/database/postgres/provider.service';

@Injectable()
export class ConversationReadService {
  constructor(private readonly db: PostgresDatabaseProviderService) {}

  public async getConversations(memberId: string) {
    return await this.db.userConversationRead.findMany({
      where: {
        memberId,
      },
    });
  }
}
