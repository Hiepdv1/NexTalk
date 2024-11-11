import { NestFactory } from '@nestjs/core';
import { SeederModule } from './app/modules/seeders/seeder.module';
import { SeederService } from './app/modules/seeders/services/Seeder.service';
import { LoggerCustom } from './common/utils/logging.service';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

const logger = new LoggerCustom(configService);

async function runSeeder() {
  const app = await NestFactory.createApplicationContext(SeederModule);
  const seeder = app.get(SeederService);

  await seeder.addClientKeys();
  await app.close();
}

runSeeder()
  .then(() => {
    logger.log('Seeder complete');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Seeder error: ', JSON.stringify(err));
    process.exit(1);
  });
