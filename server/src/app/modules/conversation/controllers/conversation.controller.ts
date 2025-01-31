import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  ParseFilePipeBuilder,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { AuthService } from '../../auth/services/auth.service';
import { ConversationService } from '../services/conversation.service';
import { Request } from 'express';
import { ConversationCacheService } from '../services/conversationCache.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConversationUploadFileDto } from '../dto/conversation.dto';
import { v4 as genuuid } from 'uuid';
import { CloudinaryService } from '@src/configs/storage/cloudianry/cloudinary.service';
import { MessageType, StorageType } from '@prisma/client';
import { MediaGateway } from '../../socket/gateway/Media.gateway';
import { DropboxService } from '@src/configs/storage/dropbox/dropbox.service';

@Controller('/conversations')
export class ConversationController {
  private readonly MESSAGE_BATCH: number = 12;
  private readonly SECRET_KEY: string;

  constructor(
    private readonly authService: AuthService,
    private readonly conversationService: ConversationService,
    private readonly conversationCacheService: ConversationCacheService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mediaGateway: MediaGateway,
    private readonly dropboxService: DropboxService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  @Post('/by-servers')
  public async getConversations(
    @Req() req: Request,
    @Body('serverIds') serverIds: string[]
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    const conversations =
      await this.conversationService.getConversationInServers(
        serverIds,
        profile.id
      );

    const conversationCache = conversations.map(async (con) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile: m1, ...restMemberOne } = con.memberOne;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profile: m2, ...restMemberTwo } = con.memberTwo;

      const conversation = {
        ...con,
        memberOne: restMemberOne,
        memberTwo: restMemberTwo,
      };

      const conversationCache =
        (await this.conversationCacheService.getConversationCache({
          serverId: con.memberOne.serverId,
        })) || [];

      conversationCache.push(conversation);

      return await this.conversationCacheService.setAndOverrideConversationCache(
        { serverId: con.memberOne.serverId },
        conversationCache
      );
    });

    await Promise.all(conversationCache);

    return AppHelperService.encrypt(
      JSON.stringify(conversations),
      this.SECRET_KEY
    );
  }

  @Post('/messages/uploadFile')
  @UseInterceptors(FileInterceptor('file'))
  public async conversationUploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1073741824 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        })
    )
    file: Express.Multer.File,
    @Req() req: Request,
    @Query() query: ConversationUploadFileDto
  ) {
    const profile = await this.authService.findUserById(req.userId);

    if (!profile) throw new NotFoundException('The user does not exist');

    const conversation = await this.conversationService.getOrCreateConversation(
      query.memberId,
      query.otherMemberId
    );

    if (
      conversation.memberOne.profileId !== profile.id &&
      conversation.memberTwo.profileId !== profile.id
    )
      throw new NotFoundException(`The memverId haven't must be user profile`);

    if (
      conversation.memberOneId !== query.memberId &&
      conversation.memberTwoId !== query.memberId
    )
      throw new NotFoundException(
        `The memberId ${query.memberId} does not exist`
      );

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

      const newMessage = await this.conversationService.createDirectMessage({
        content: uploadFile._id,
        fileUrl: uploadFile.url,
        fileId: uploadFile._id,
        type: MessageType.VIDEO,
        posterId: thumbnailUpload._id,
        posterUrl: thumbnailUpload.url,
        conversationId: conversation.id,
        memberId: query.memberId,
        storageType: 'CLOUDINARY',
      });

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.mediaGateway.server.emit(
        'conversation:messages:updated',
        encryptData
      );

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

      const newMessage = await this.conversationService.createDirectMessage({
        content: uploadFiles.url,
        fileUrl: uploadFiles.url,
        fileId: uploadFiles.file.path_lower,
        conversationId: conversation.id,
        memberId: query.memberId,
        type,
        storageType: StorageType.DROPBOX,
      });

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(newMessage),
        this.SECRET_KEY
      );

      this.mediaGateway.server.emit(
        'conversation:messages:updated',
        encryptData
      );

      return {
        statusCode: 200,
        message: 'uploaded successfully',
      };
    }
  }
}
