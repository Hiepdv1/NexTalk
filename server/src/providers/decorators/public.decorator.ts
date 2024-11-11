import { SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const PUBLIC_KEY = configService.get('PUBLIC_KEY');
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const HttpPublic = () => SetMetadata('isHttpPublic', true);
export const WsPublic = () => SetMetadata('isWsPublic', true);
