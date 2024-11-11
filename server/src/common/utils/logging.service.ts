import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Winston from 'winston';
import 'winston-daily-rotate-file';

type WinstonType = typeof Winston;

@Injectable()
export class LoggerCustom implements LoggerService {
  private winston = Winston;
  private Logging: Winston.Logger;

  private levels = {
    error: 0,
    debug: 1,
    warn: 2,
    http: 3,
    info: 4,
  };

  private colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  };

  constructor(private readonly configService: ConfigService) {
    this.winston.addColors(this.colors);
    this.FormatLog(this.winston);
    this.Logging = this.createLogger();
  }

  log(message: string, ...optionalParams: any[]) {
    message += optionalParams
      .map((error) => `\n${JSON.stringify(error)}`)
      .join('');
    this.Logging.info(`\n${message}`);
  }

  error(message: any, ...optionalParams: any[]) {
    message += optionalParams
      .map((error) => `\n${JSON.stringify(error)}`)
      .join('');
    this.Logging.error(message);
  }
  warn(message: any, ...optionalParams: any[]) {
    message += optionalParams
      .map((error) => `\n${JSON.stringify(error)}`)
      .join('');
    this.Logging.warn(message);
  }
  debug?(message: any, ...optionalParams: any[]) {
    message += optionalParams
      .map((error) => `\n${JSON.stringify(error)}`)
      .join('');
    this.Logging.debug(message);
  }

  private Level() {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    return isDevelopment ? 'debug' : 'error';
  }

  private FormatLog(winston: WinstonType) {
    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize({ all: true }),
      winston.format.prettyPrint(),
      winston.format.printf((info) =>
        `
        \n---------------------------------------- ${info.timestamp} ----------------------------------------\n
    Level: ${info.level} ${info.message}`.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
      )
    );

    return format;
  }

  private TransportsDev(winston: WinstonType) {
    const isDevelopment = this.configService.get('NODE_ENV') === 'development';
    const transports = isDevelopment
      ? [
          new winston.transports.DailyRotateFile({
            filename: 'appLogs/debug-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'debug',
          }),
          new winston.transports.DailyRotateFile({
            filename: 'appLogs/info-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'info',
          }),
          new winston.transports.DailyRotateFile({
            filename: 'appLogs/allLogs-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
          }),
        ]
      : [];
    return transports;
  }

  private Transport(winston: WinstonType) {
    const transports = [
      new winston.transports.Console(),
      new winston.transports.DailyRotateFile({
        filename: 'appLogs/errors-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
      }),
      new winston.transports.DailyRotateFile({
        filename: 'appLogs/http-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'http',
      }),
      ...this.TransportsDev(winston),
    ];

    return transports;
  }

  private createLogger() {
    const winston = this.winston;
    const transports = this.Transport(winston);
    const levels = this.levels;
    const format = this.FormatLog(winston);

    const logger = winston.createLogger({
      level: this.Level(),
      levels,
      format,
      transports,
    });

    return logger;
  }
}
