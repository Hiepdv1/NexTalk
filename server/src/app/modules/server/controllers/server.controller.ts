import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { v4 as genuui } from 'uuid';
import { CreateServerInput, UpdateServerInput } from '../dto/server.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServerService } from '../services/server.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { PaginationParamsDto } from '../dto/pagination.dto';
import { AuthService } from '../../auth/services/auth.service';
import { Request } from 'express';
import { MemberRole, Prisma } from '@prisma/client';
import { MemberRoleParamsDto } from '../dto/member.dto';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';
import { ServerCacheService } from '../services/serverCache.service';
import { MediaGateway } from '../../socket/gateway/Media.gateway';
import { SocketService } from '../../socket/services/socket.service';
import { MemberService } from '../../members/services/member.service';

@Controller('/servers')
export class ServerController {
  private SECRET_KEY: string;

  constructor(
    private readonly serverService: ServerService,
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mediaGateway: MediaGateway,
    private readonly configService: ConfigService,
    private readonly serverCacheService: ServerCacheService,
    private readonly socketService: SocketService,
    private readonly memberService: MemberService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  @Post('/create')
  @UseInterceptors(FileInterceptor('image'))
  async createServer(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|gif)$/,
        })
        .addMaxSizeValidator({ maxSize: 5242880 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        })
    )
    file: Express.Multer.File,
    @Body() data: CreateServerInput
  ) {
    const existingUser = await this.authService.findUserById(data.profileId);

    if (!existingUser)
      throw new BadRequestException('The userId does not exist');

    const uploadToCloud = (await this.cloudinaryService.UploadFile(
      file,
      'Discord/ServerImages',
      file.mimetype
    )) as {
      _id: string;
      url: string;
    };
    const inviteCode = genuui();

    const server = await this.serverService.createServer({
      name: data.name,
      imageUrl: uploadToCloud.url,
      cloudId: uploadToCloud._id,
      inviteCode,
      profileId: existingUser.id,
    });

    await this.serverCacheService.setAndOverrideServerCache(server.id, server);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(server),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit('server:created:update', encryptData);

    return {
      statusCode: 200,
      message: 'Created server successfully',
    };
  }

  @Patch('/:serverId')
  @UseInterceptors(FileInterceptor('image'))
  async updatedServer(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|gif)$/,
        })
        .addMaxSizeValidator({ maxSize: 5242880 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        })
    )
    file: Express.Multer.File,
    @Param('serverId') serverId: string,
    @Body() data: UpdateServerInput,
    @Req() req: Request
  ) {
    const findProfile = this.authService.findUserById(req.userId);
    const findServer = this.serverService.GetServerById(serverId);

    const [profile, server] = await Promise.all([findProfile, findServer]);

    if (!profile) throw new NotFoundException('The user does not exist');
    if (!server) throw new NotFoundException('The server does not exist');

    const [uploadToCloud] = await Promise.all([
      this.cloudinaryService.UploadFile(
        file,
        'Discord/ServerImages',
        file.mimetype
      ),
      this.cloudinaryService.Destroy(server.cloudId),
    ]);

    const { _id, url } = uploadToCloud as {
      _id: string;
      url: string;
    };

    const updateData: Prisma.ServerUpdateInput = {
      ...data,
      cloudId: _id,
      imageUrl: url,
    };

    const updated = this.serverService.updatedServer(serverId, updateData);

    return updated;
  }

  @Get('/first-server')
  async GetFirstServer(@Req() req: Request) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new BadRequestException('The user does not exist');

    const server = await this.serverService.GetFirstServer(profile.id);

    if (!server)
      throw new NotFoundException('Currently You are not having a server');

    return server;
  }

  @Get('/')
  async GetAllServers(
    @Query() query: PaginationParamsDto,
    @Req() req: Request
  ) {
    const userId = req.userId;
    const existingUser = await this.authService.findUserById(userId);
    if (!existingUser) throw new BadRequestException('UserId not found');

    const data = await this.serverService.GetServers(existingUser.id, {
      limit: query.limit,
      offset: query.offset,
      startedId: query.startingId,
    });

    const caches = data.servers.map(async (server) => {
      const members = server.members.map((member) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { conversationsInitiated, conversationsReceived, ...rest } =
          member;

        return rest;
      });

      const channels = server.channels.map((channel) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { messages, ...rest } = channel;
        return rest;
      });

      const serverData = {
        ...server,
        members,
        channels,
      };

      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        serverData
      );
    });

    await Promise.all(caches);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(data),
      this.SECRET_KEY
    );

    return encryptData;
  }

  @Get('/:serverId')
  public async GetServerId(
    @Param('serverId') serverId: string,
    @Req() req: Request
  ) {
    const userId = req.userId;

    const profile = await this.authService.findUserById(userId);
    if (!profile) throw new BadRequestException('The userId not found');

    const server = await this.serverService.GetServerProfileById(
      serverId,
      profile.id
    );
    if (!server) throw new NotFoundException('Server Id not found');

    return server;
  }

  @Get('/channels/:serverId')
  public async getChannels(
    @Req() req: Request,
    @Param('serverId') serverId: string
  ) {
    const user = req.userId;
    const findProfile = this.authService.findUserById(user);
    const findChannels = this.serverService.GetServerChannels(serverId);

    const [channels, profile] = await Promise.all([findChannels, findProfile]);
    if (!profile) throw new BadRequestException('The userId not found');
    if (!channels) throw new BadRequestException('The ServerId not found');
    return channels;
  }

  @Patch('/:serverId/invite-code')
  async GenerateNewInviteCode(
    @Param('serverId') serverId: string,
    @Req() req: Request
  ) {
    const userId = req.userId;

    const profile = await this.authService.findUserById(userId);

    if (!profile) throw new BadRequestException('The useId does not exist');

    const server = await this.serverService.GenerateNewInviteCode(
      serverId,
      profile.id
    );

    if (!server) throw new BadRequestException('The serverId does not exist');

    return server;
  }

  @Get('/invite/:inviteCode')
  async GetInviteCode(
    @Param('inviteCode') inviteCode: string,
    @Req() req: Request
  ) {
    const userId = req.userId;

    const profile = await this.authService.findUserById(userId);

    const findServerWithMembers =
      await this.serverService.GetServerWithMembersByInviteCode(
        inviteCode,
        profile.id
      );

    if (!findServerWithMembers) {
      throw new NotFoundException('The server or user does not exist');
    }

    const userIds = [...this.socketService.USERS_ONLINE.values()];

    const USERS_ONLINE = await this.memberService.CountMembersInServer({
      userIds,
      serverId: findServerWithMembers.server.id,
    });

    return {
      server: findServerWithMembers.server,
      members: findServerWithMembers.members.length,
      isMember: findServerWithMembers.isMember,
      online: USERS_ONLINE,
    };
  }

  @Patch('/join/:inviteCode')
  async JoinServer(
    @Req() req: Request,
    @Param('inviteCode') inviteCode: string
  ) {
    const userId = req.userId;
    const profile = await this.authService.findUserById(userId);

    if (!profile) throw new NotFoundException('The userId does not exist');

    const server = await this.serverService.GetServerByInviteCode(inviteCode);

    if (!server) throw new NotFoundException('The server does not exist');

    const isMember = server.members.some(
      (member) => member.profileId === profile.id
    );

    if (isMember)
      throw new BadRequestException('The user already exists in this server');

    const [addToMember, serverCache] = await Promise.all([
      this.serverService.AddMemberToServerByInviteCode(inviteCode, profile.id),
      this.serverCacheService.getServerCache(server.id),
    ]);

    const newMember = addToMember.members[0];

    if (!serverCache) {
      const server = await this.serverService.getServerById(addToMember.id);
      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    } else {
      const conversationsInitiated = newMember.conversationsInitiated.map(
        (con) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { directMessages, ...rest } = con;
          return rest;
        }
      );

      const newMemberCache = {
        ...newMember,
        conversationsInitiated,
      };
      serverCache.members.push(newMemberCache);
      await this.serverCacheService.setAndOverrideServerCache(
        serverCache.id,
        serverCache
      );
    }

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(newMember),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit(
      `server:${newMember.serverId}:members:update`,
      encryptData
    );

    return addToMember;
  }

  @Patch('/members/:memberId')
  public async ChangeMemberRoleInServer(
    @Req() req: Request,
    @Query() query: MemberRoleParamsDto,
    @Body() body: { role: MemberRole }
  ) {
    const userId = req.userId;

    const [profile, serverCache] = await Promise.all([
      this.authService.findUserById(userId),
      this.serverCacheService.getServerCache(query.serverId),
    ]);

    if (!profile) throw new NotFoundException('The User doest not exist');

    const updated = this.serverService.UpdateMemberRoleInServer(
      query.serverId,
      profile.id,
      query.memberId,
      body.role
    );

    let server = serverCache;

    if (!server) {
      server = await this.serverService.getServerById(query.serverId);
      if (!server) throw new NotFoundException('The user does not exist');
      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    } else {
      const member = server.members.find(
        (member) => member.id === query.memberId
      );

      if (!member)
        throw new NotFoundException('The member does not exist this server');

      member.role = body.role;

      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    }

    const keyEvent = `server:${server.id}:member:update:role`;

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({
        memberId: query.memberId,
        serverId: query.serverId,
        role: body.role,
      }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit(keyEvent, encryptData);

    return updated;
  }

  @Delete('/members/:memberId/kick')
  public async DeleteMemberInServer(
    @Req() req: Request,
    @Query() query: MemberRoleParamsDto
  ) {
    const [serverCache, profile] = await Promise.all([
      this.serverCacheService.getServerCache(query.serverId),
      this.authService.findUserById(req.userId),
    ]);

    if (!profile) throw new NotFoundException('The User does not exist');

    await Promise.all([
      this.serverService.DeleteMemberInServer(
        query.serverId,
        profile.id,
        query.memberId
      ),
    ]);

    let server = serverCache;

    if (!server) {
      server = await this.serverService.getServerById(query.serverId);
      if (!server) throw new NotFoundException('The server does not exist');
      await this.serverCacheService.setAndOverrideServerCache(
        query.serverId,
        server
      );
    } else {
      const members = server.members.filter(
        (member) => member.id !== query.memberId
      );

      server.members = members;

      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    }

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({ id: query.memberId }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit(
      `server:${server.id}:member:kick`,
      encryptData
    );

    return {
      statusCode: 200,
      message: 'successfully',
    };
  }

  @Patch('/:serverId/leave')
  public async leaveServer(
    @Param('serverId') serverId: string,
    @Req() req: Request
  ) {
    const [profile, serverCache] = await Promise.all([
      this.authService.findUserById(req.userId),
      this.serverCacheService.getServerCache(serverId),
    ]);

    if (!profile) throw new NotFoundException('The user does not exist');

    let server = serverCache;

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new NotFoundException('The server does not exist');
      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    }

    const memberLeave = server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!memberLeave)
      throw new NotFoundException('The member already not exists this server');

    await this.serverService.LeaveServer(serverId, profile.id);

    const members = server.members.filter(
      (member) => member.profileId !== profile.id
    );

    server.members = members;

    await this.serverCacheService.setAndOverrideServerCache(server.id, server);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({ id: memberLeave.id, serverId }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit(
      `server:${server.id}:member:leave`,
      encryptData
    );

    return {
      message: 'Successfully',
      statusCode: 200,
    };
  }

  @Get('/:serverId/details')
  public async getServerDetails(
    @Req() req: Request,
    @Param('serverId') serverId: string
  ) {
    const profile = await this.authService.findUserById(req.userId);
    if (!profile) throw new NotFoundException('The user does not exist');

    const server = await this.serverService.getServerDetails(
      serverId,
      profile.id
    );

    return server;
  }

  @Delete('/:serverId/delete')
  public async deleteServer(
    @Param('serverId') serverId: string,
    @Req() req: Request
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    const server = await this.serverService.GetServerById(serverId);

    if (!server) throw new NotFoundException('The server does not exist');

    const [deletedServer] = await Promise.all([
      this.serverService.DeleteServer(profile.id, server.id),
      this.cloudinaryService.Destroy(server.cloudId),
    ]);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({ id: deletedServer.id }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit('server:deleted:update', encryptData);

    return {
      statusCode: 200,
      message: 'Server deleted successfully',
    };
  }
}
