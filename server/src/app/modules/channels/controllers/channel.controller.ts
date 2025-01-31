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
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../../auth/services/auth.service';
import { Request } from 'express';
import {
  ChannelEditDto,
  CreateChannelDto,
  EditMessageFileDto,
} from '../dto/channel.dto';
import { ChannelService } from '../services/channel.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ServerService } from '../../server/services/server.service';
import { DropboxService } from 'src/configs/storage/dropbox/dropbox.service';
import { MessageService } from '../../socket/services/message.service';
import { ChannelCacheService } from '../services/channelCache.service';
import { CloudinaryService } from 'src/configs/storage/cloudianry/cloudinary.service';
import { v4 as genuuid } from 'uuid';
import { MessageType, StorageType } from '@prisma/client';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { ServerCacheService } from '../../server/services/serverCache.service';
import { MediaGateway } from '../../socket/gateway/Media.gateway';

@Controller('/channels')
export class ChannelController {
  private SECRET_KEY: string;
  private HASH_MESSAGE_SECRET_KEY_DB: string;

  constructor(
    private readonly authService: AuthService,
    private readonly channelService: ChannelService,
    private readonly serverService: ServerService,
    private readonly dropboxService: DropboxService,
    private readonly messageService: MessageService,
    private readonly channelCacheService: ChannelCacheService,
    private readonly profileCacheService: ProfileCacheService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mediaGateway: MediaGateway,
    private readonly configService: ConfigService,
    private readonly serverCacheService: ServerCacheService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
    this.HASH_MESSAGE_SECRET_KEY_DB = configService.get<string>(
      'HASH_MESSAGE_SECRET_KEY_DB'
    );
  }

  @Post('/create')
  public async createChannel(
    @Req() req: Request,
    @Query('serverId') serverId: string,
    @Body() data: CreateChannelDto
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
    }

    const serverUpdated = await this.channelService.CreateChannel(
      profile.id,
      serverId,
      data
    );

    const createdChannel = serverUpdated.channels[0];

    server.channels.push(createdChannel);

    await this.serverCacheService.setAndOverrideServerCache(serverId, server);

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(createdChannel),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit('channel:update:global', encryptData);

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
      JSON.stringify({ channelId, serverId }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit('channel:deleted:global', encryptData);

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

    await this.channelService.updateChannel(
      channelId,
      serverId,
      profile.id,
      data
    );

    const encryptedData = AppHelperService.encrypt(
      JSON.stringify({
        id: channelId,
        serverId,
        name: data.name,
        type: data.type,
      }),
      this.SECRET_KEY
    );

    this.mediaGateway.server.emit('channel:update:global', encryptedData);
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
        'NexTalk/videos',
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
        'NexTalk/images',
        genuuid()
      );

      const newMessage = await this.messageService.CreateMessage(
        {
          content: uploadFile._id,
          fileUrl: uploadFile.url,
          fileId: uploadFile._id,
          type: MessageType.VIDEO,
          posterId: thumbnailUpload._id,
          posterUrl: thumbnailUpload.url,
          channelId: channelId,
          memberId: isExistingMember.id,
        },
        StorageType.CLOUDINARY
      );

      newMessage.content = AppHelperService.decrypt(
        newMessage.content,
        this.HASH_MESSAGE_SECRET_KEY_DB
      );

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.mediaGateway.server.emit(`chat:${channelId}:messages`, encryptData);

      return {
        statusCode: 200,
        message: 'uploaded successfully',
      };
    } else {
      const uploadFiles = await this.dropboxService.uploadFile(
        file.originalname,
        file.buffer,
        { path: '/NexTalk/File-Messages' }
      );

      const type = file.mimetype.startsWith('image/')
        ? MessageType.IMAGE
        : MessageType.FILE;

      const newMessage = await this.messageService.CreateMessage(
        {
          content: uploadFiles.url,
          fileUrl: uploadFiles.url,
          fileId: uploadFiles.file.path_lower,
          type,
          channelId: channelId,
          memberId: isExistingMember.id,
        },
        StorageType.DROPBOX
      );

      newMessage.content = AppHelperService.decrypt(
        newMessage.content,
        this.HASH_MESSAGE_SECRET_KEY_DB
      );

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.mediaGateway.server.emit(`chat:${channelId}:messages`, encryptData);

      return {
        statusCode: 200,
        message: 'uploaded successfully',
      };
    }
  }

  @Patch('/messages/editFile')
  @UseInterceptors(FileInterceptor('file'))
  public async EditMessageFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 104857600 })
        .build({
          // errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        })
    )
    file: Express.Multer.File,
    @Req() req: Request,
    @Body() data: EditMessageFileDto
  ) {
    const userId = req.userId;
    const { messageId, channelId, serverId, thubnailHeight, thubnailWidth } =
      data;
    const profile = await this.authService.findUserById(userId);

    if (!profile) throw new UnauthorizedException('Unauthorized');
    const message = await this.channelService.ExistingMessage({
      channelId,
      serverId,
      messageId,
      profileId: profile.id,
    });

    if (!message) throw new NotFoundException('The Message was not found');

    if (file.mimetype.startsWith('video/')) {
      const uploadVideo = (await this.cloudinaryService.UploadFile(
        file,
        'NexTalk/videos',
        file.mimetype
      )) as { _id: string; url: string };

      const thumbnailBuffer =
        await this.cloudinaryService.createThumbnailFromVideo(
          uploadVideo._id,
          '10',
          { width: thubnailWidth ?? 600, height: thubnailHeight ?? 500 }
        );

      const thumbnailUpload = await this.cloudinaryService.uploadBuffer(
        thumbnailBuffer,
        'NexTalk/images',
        genuuid()
      );

      if (message.type === MessageType.VIDEO) {
        await Promise.all([
          this.messageService.addToTempStoreFile({
            fileId: message.fileId,
            storageType: message.storageType,
            messageType: 'VIDEO',
          }),
          this.messageService.addToTempStoreFile({
            fileId: message.posterId,
            storageType: message.storageType,
            messageType: 'IMAGE',
          }),
        ]);
      } else {
        await this.messageService.addToTempStoreFile({
          fileId: message.fileId,
          storageType: message.storageType,
          messageType: message.type,
        });
      }

      const messageUpdated = await this.channelService.UpdateMessageVideo({
        channelId,
        serverId,
        messageId,
        content: uploadVideo.url,
        fileId: uploadVideo._id,
        fileUrl: uploadVideo.url,
        posterId: thumbnailUpload._id,
        posterUrl: thumbnailUpload.url,
        profileId: profile.id,
      });

      messageUpdated.content = AppHelperService.decrypt(
        messageUpdated.content,
        this.HASH_MESSAGE_SECRET_KEY_DB
      );

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          ...messageUpdated,
          channelId,
          serverId,
        }),
        this.SECRET_KEY
      );

      console.log('Emmiting message update: ', encryptData);

      this.mediaGateway.server.emit('chat:message:update:global', encryptData);
      return;
    } else {
      const uploadFile = await this.dropboxService.uploadFile(
        file.originalname,
        file.buffer,
        { path: '/NexTalk/File-Messages' }
      );

      if (message.type === MessageType.VIDEO) {
        await Promise.all([
          this.messageService.addToTempStoreFile({
            fileId: message.fileId,
            storageType: StorageType.CLOUDINARY,
            messageType: MessageType.VIDEO,
          }),
          this.messageService.addToTempStoreFile({
            fileId: message.posterId,
            storageType: StorageType.CLOUDINARY,
            messageType: MessageType.IMAGE,
          }),
        ]);
      } else {
        await this.messageService.addToTempStoreFile({
          fileId: message.fileId,
          storageType: StorageType.DROPBOX,
          messageType: message.type,
        });
      }

      const currentType = file.mimetype.startsWith('video/')
        ? MessageType.VIDEO
        : file.mimetype.startsWith('image/')
          ? MessageType.IMAGE
          : MessageType.FILE;

      const messageUpdated = await this.channelService.updateMessageFile({
        channelId,
        serverId,
        messageId,
        content: uploadFile.url,
        fileId: uploadFile.file.path_lower,
        fileUrl: uploadFile.url,
        profileId: profile.id,
        type: currentType,
      });

      messageUpdated.content = AppHelperService.decrypt(
        messageUpdated.content,
        this.HASH_MESSAGE_SECRET_KEY_DB
      );

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          ...messageUpdated,
          channelId,
          serverId,
        }),
        this.SECRET_KEY
      );

      console.log('Emmiting message update: ', encryptData);
      this.mediaGateway.server.emit('chat:message:update:global', encryptData);

      return;
    }
  }

  @Get('/')
  public async getAllChannel(@Req() req: Request) {
    const profile = await this.authService.findUserById(req.userId);

    const channels = await this.channelService.getAllChannels(profile.id);

    return channels;
  }
}
