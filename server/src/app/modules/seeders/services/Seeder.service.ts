import { Injectable, Logger } from '@nestjs/common';
import { PostgresDatabaseProviderService } from '../../../../providers/database/postgres/provider.service';
import { RequestClientData } from '../data/request-client.data';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeederService {
  private readonly logger = new Logger();
  private SECRET_KEY: string;

  constructor(
    private readonly db: PostgresDatabaseProviderService,
    private readonly configService: ConfigService
  ) {
    this.SECRET_KEY = configService.get<string>('ENCRYPTION_KEY');
  }

  async addClientKeys(): Promise<void> {
    this.logger.log('...Client Keys start...');

    const newClientIds = [];

    for (const client of RequestClientData) {
      const existingClient = await this.db.configClient.findUnique({
        where: { key: client.clientId },
      });

      if (!existingClient) {
        newClientIds.push(client);
        const encryptedKey = AppHelperService.encrypt(
          client.clientKey,
          this.SECRET_KEY
        );
        await this.db.configClient.create({
          data: {
            key: client.clientId,
            value: JSON.stringify({
              clientName: client.clientName,
              clientKey: encryptedKey,
            }),
            description: `Request Signature data for ${client.clientName}`,
          },
        });
      }
    }

    if (newClientIds.length) {
      // Shared client
      this.logger.log(`Client: ${JSON.stringify(newClientIds)}`);
    }

    this.logger.log('...Client Keys Added...');
  }
}
