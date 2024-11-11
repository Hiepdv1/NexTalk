import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { CreateUserInput } from '../dto/auth.dto';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Profile } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/providers/decorators/public.decorator';

@Controller('/user')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Post('/')
  async createUser(@Body('data') createUserDataInput: CreateUserInput) {
    const existingUser = await this.authService.findUserById(
      createUserDataInput.userId
    );

    let user: Profile;

    if (existingUser) {
      user = existingUser;
    } else {
      user = await this.authService.createProfile(createUserDataInput);
    }

    return user;
  }

  @Get('/')
  async getUser() {
    return clerkClient.users.getUserList();
  }
}
