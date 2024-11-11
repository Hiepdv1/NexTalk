import { Controller, Get, HttpException } from '@nestjs/common';

@Controller('')
export class MainController {
  @Get('/')
  Test() {
    throw new HttpException('HttpException Test', 401);
  }
}
