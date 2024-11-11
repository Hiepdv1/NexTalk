import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { PostgresDatabaseProviderService } from 'src/providers/database/postgres/provider.service';

@Injectable()
export class ClientService {
  private SECRET_KEY: string;

  constructor(
    private readonly db: PostgresDatabaseProviderService,
    private readonly configService: ConfigService
  ) {
    this.SECRET_KEY = configService.get<string>('ENCRYPTION_KEY');
  }

  async findOneByKey(key: string) {
    const clientInfo = await this.db.configClient.findUnique({
      where: { key },
    });

    if (!clientInfo) return '';

    const keyInformation = JSON.parse(clientInfo.value);

    return AppHelperService.decrypt(keyInformation.clientKey, this.SECRET_KEY);
  }

  async validateConfigValue(key: string): Promise<boolean> {
    const config = await this.findOneByKey(key);

    return config ? true : false;
  }
}
