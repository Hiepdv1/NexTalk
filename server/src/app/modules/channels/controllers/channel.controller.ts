import {
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
import { AuthService } from '../../auth/services/auth.service';
import { Request } from 'express';
import { ChannelEditDto, CreateChannelDto } from '../dto/channel.dto';
import { ChannelService } from '../services/channel.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServerService } from '../../server/services/server.service';
import { DropboxService } from 'src/configs/storage/dropbox/dropbox.service';
import { MessageService } from '../../socket/services/message.service';
import { ChannelCacheService } from '../services/channelCache.service';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { v4 as genuuid } from 'uuid';
import { MessageType } from '@prisma/client';
import { ChatGateway } from '../../socket/gateway/chat.gateway';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';

@Controller('/channels')
export class ChannelController {
  private SECRET_KEY: string;

  constructor(
    private readonly authService: AuthService,
    private readonly channelService: ChannelService,
    private readonly serverService: ServerService,
    private readonly dropboxService: DropboxService,
    private readonly messageService: MessageService,
    private readonly channelCacheService: ChannelCacheService,
    private readonly profileCacheService: ProfileCacheService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  @Post('/create')
  public async createChannel(
    @Req() req: Request,
    @Query('serverId') serverId: string,
    @Body() data: CreateChannelDto
  ) {
    const [profile, userJoinedServers] = await Promise.all([
      this.authService.findUserById(req.userId),
      this.profileCacheService.getUserJoinedServers(req.userId),
    ]);

    if (!profile) throw new NotFoundException('The user does not exist');

    if (!userJoinedServers) {
      throw new NotFoundException('User has not joined any servers');
    }

    const serverUpdated = await this.channelService.CreateChannel(
      profile.id,
      serverId,
      data
    );

    const createdChannel = serverUpdated.channels[0];

    const server = userJoinedServers.find((servver) => servver.id === serverId);

    if (!server) throw new NotFoundException('The server is not found');

    console.log('Channel Created: ', createdChannel);

    server.channels.push(createdChannel);

    await this.profileCacheService.setUserJoinedServersCache(
      req.userId,
      userJoinedServers
    );

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(createdChannel),
      this.SECRET_KEY
    );

    this.chatGateway.server.emit('channel:created:update', encryptData);

    return {
      statusCode: 200,
      message: 'Created channel successfully',
    };
  }

  @Delete('/:channelId/delete')
  public async DeleteChannel(
    @Req() req: Request,
    @Param('channelId') channelId: string,
    @Query('serverId') serverId: string
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    await this.channelService.DeleteChannel(serverId, channelId, profile.id);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({ id: channelId, serverId }),
      this.SECRET_KEY
    );

    this.chatGateway.server.emit('channel:deleted:update', encryptData);

    return {
      statusCode: 200,
      message: 'Channel deleted successfully',
    };
  }

  @Patch('/:channelId')
  public async EditChannel(
    @Param('channelId') channelId: string,
    @Query('serverId') serverId: string,
    @Req() req: Request,
    @Body() data: ChannelEditDto
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The User does not exist');

    const channelUpdated = await this.channelService.updateChannel(
      channelId,
      serverId,
      profile.id,
      data
    );

    return channelUpdated;
  }

  @Get('/:channelId/myself')
  public async getChannelAndMyself(
    @Param('channelId') channelId: string,
    @Query('serverId') serverId: string,
    @Req() req: Request
  ) {
    const profile = await this.authService.findUserById(req.userId);
    if (!profile) throw new NotFoundException('The user does not exist');

    const channelKey = {
      serverId,
      profileId: profile.id,
      channelId,
    };

    const channelMemberKey = {
      serverId,
      profileId: profile.id,
      channelId,
      memberId: profile.id,
    };

    const [channelCacheData, channelMemberCacheData] = await Promise.all([
      this.channelCacheService.getChannelCache(channelKey),
      this.channelCacheService.getChannelMember(channelMemberKey),
    ]);

    console.log(
      channelCacheData,
      channelMemberCacheData,
      '------------------ Cache Data ------------------'
    );
    console.log('Get Cache');

    if (channelCacheData && channelMemberCacheData) {
      return {
        channel: channelCacheData,
        myself: channelMemberCacheData,
      };
    }

    console.log('No Cache');

    const { channel, myself } = await this.channelService.getChannelAndMySelf(
      channelId,
      profile.id,
      serverId
    );

    await Promise.all([
      this.channelCacheService.setChannelCache(channelKey, channel),
      this.channelCacheService.setChannelMemberCache(channelMemberKey, myself),
    ]);

    return {
      channel,
      myself,
    };
  }

  @Post('/messages/uploadFile')
  @UseInterceptors(FileInterceptor('file'))
  public async messageChannelUploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1073741824 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        })
    )
    file: Express.Multer.File,
    @Req() req: Request,
    @Query('channelId') channelId: string,
    @Query('serverId') serverId: string
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    const server = await this.serverService.getServerWithMemebers(
      serverId,
      profile.id
    );

    const isExistingMember = server.members.find(
      (member) => member.profileId === profile.id
    );

    if (!isExistingMember)
      throw new NotFoundException('The member does not exist this server');

    if (file.mimetype.startsWith('video/')) {
      const uploadFile = (await this.cloudinaryService.UploadFile(
        file,
        'Discord/videos',
        file.mimetype
      )) as { _id: string; url: string };

      const thumbnailBuffer =
        await this.cloudinaryService.createThumbnailFromVideo(
          uploadFile._id,
          '10',
          { width: 384, height: 220 }
        );

      const thumbnailUpload = await this.cloudinaryService.uploadBuffer(
        thumbnailBuffer,
        'Discord/images',
        genuuid()
      );

      const newMessage = await this.messageService.CreateMessage({
        content: uploadFile._id,
        fileUrl: uploadFile.url,
        fileId: uploadFile._id,
        type: MessageType.VIDEO,
        posterId: thumbnailUpload._id,
        posterUrl: thumbnailUpload.url,
        channelId: channelId,
        memberId: isExistingMember.id,
      });

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.chatGateway.server.emit(`chat:${channelId}:messages`, encryptData);

      return {
        statusCode: 200,
        message: 'uploaded successfully',
      };
    } else {
      const uploadFiles = await this.dropboxService.uploadFile(
        file.originalname,
        file.buffer,
        { path: '/Discord-app/File-Messages' }
      );

      const newMessage = await this.messageService.CreateMessage({
        content: uploadFiles.url,
        fileUrl: uploadFiles.url,
        fileId: uploadFiles.file.path_lower,
        type: MessageType.FILE,
        channelId: channelId,
        memberId: isExistingMember.id,
      });

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.chatGateway.server.emit(`chat:${channelId}:messages`, encryptData);

      return {
        statusCode: 200,
        message: 'uploaded successfully',
      };
    }
  }

  @Get('/')
  public async getAllChannel(@Req() req: Request) {
    const profile = await this.authService.findUserById(req.userId);

    const channels = await this.channelService.getAllChannels(profile.id);

    return channels;
  }
}
