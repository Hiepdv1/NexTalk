import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerCustom } from './common/utils/logging.service';
import { CustomValidationMessages } from './common/pipes/Custom.validation';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { SocketAdapter } from './providers/Adapter/socket.adapter';
import { HttpExceptionsFilter } from './common/exceptions/http-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(MainModule, { bodyParser: true });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT');

  app.useWebSocketAdapter(new SocketAdapter(app));
  app.useGlobalFilters(new HttpExceptionsFilter(configService));

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  app.use(bodyParser.json({ limit: '1gb' }));
  app.useLogger(new LoggerCustom(configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      stopAtFirstError: true,
      exceptionFactory: CustomValidationMessages,
    })
  );

  await app.listen(port);
}
bootstrap();
