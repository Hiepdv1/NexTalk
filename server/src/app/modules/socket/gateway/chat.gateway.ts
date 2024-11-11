import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { v4 as genuuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { AuthWsMiddleware } from 'src/common/middlewares/AuthWs.middleware';
import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { WsCombinedGuard } from 'src/common/guard/WsCombined.guard';
import { AuthService } from '../../auth/services/auth.service';
import { ServerService } from '../../server/services/server.service';
import { ChannelService } from '../../channels/services/channel.service';
import { MessageService } from '../services/message.service';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../../conversation/services/conversation.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  public server: Server;

  private readonly MESSAGE_BATCH: number = 12;

  private readonly logger = new Logger();
  private SECRET_KEY: string;

  private pingInterval: NodeJS.Timeout;
  private pingTimeout: NodeJS.Timeout;

  constructor(
    private readonly socketService: ChatService,
    private readonly authWs: AuthWsMiddleware,
    private readonly authService: AuthService,
    private readonly serverService: ServerService,
    private readonly channelService: ChannelService,
    private readonly messageService: MessageService,
    private readonly profileCacheService: ProfileCacheService,
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  handleConnection(socket: Socket) {
    this.authWs.use(socket, (err) => {
      if (err) {
        socket.emit('unauthorized_error', {
          message: 'Unauthorized access. Token verification failed.',
        });
        socket.disconnect();
        return;
      }

      const clientId = genuuid();

      socket.data.userId = clientId;

      this.socketService.handleConnection(socket);
      this.startPing(socket);
      console.log('Client connected:', socket.id);
      console.log('Is connected:', socket.connected);
    });
  }

  handleDisconnect(socket: Socket) {
    console.log('Client disconnected:', socket.id);
    clearInterval(this.pingInterval);
    clearTimeout(this.pingTimeout);
  }

  startPing(socket: Socket) {
    this.pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
        this.pingTimeout = setTimeout(() => {
          console.log(
            'Client did not respond to ping, disconnecting:',
            socket.id
          );
          this.handleDisconnect(socket);
        }, 10000);
      }
    }, 25000);

    socket.on('pong', () => {
      console.log('Received pong from:', socket.id);
      clearTimeout(this.pingTimeout);
    });
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('send_message')
  public async handleSendChannelMessage(socket: Socket, values: any) {
    try {
      const decrypt = AppHelperService.decrypt(
        values?.message,
        this.SECRET_KEY
      ) as any;
      const { channelId, memberId, content, serverId, timestamp } =
        JSON.parse(decrypt);
      if (!channelId || !memberId || !content || !timestamp)
        throw new BadRequestException(
          'Channel ID, Member ID, timestamp, and content are required.'
        );

      const userJoinedServersCache =
        await this.profileCacheService.getUserJoinedServers(socket.userId);

      if (!userJoinedServersCache)
        throw new NotFoundException("The user doesn't exist");

      const server = userJoinedServersCache.find(
        (server) => server.id === serverId
      );

      if (!server) throw new NotFoundException("The server doesn't exist");

      const channel = server.channels.find(
        (channel) => channel.id === channelId
      );

      const member = server.members.find((member) => member.id === memberId);

      if (!channel) throw new NotFoundException("The channel doesn't exist");

      const message = {
        id: genuuid(),
        content: content,
        channelId: channelId,
        memberId: memberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Send message on: ', `chat:${channelId}:messages`);

      const encryptMessage = AppHelperService.encrypt(
        JSON.stringify({
          ...message,
          member,
          timestamp,
        }),
        this.SECRET_KEY
      );

      this.server.emit(`chat:${channelId}:messages`, encryptMessage);

      this.messageService.CreateMessage(message).catch((error) => {
        this.logger.error('Error saving message:', error);
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        socket.emit('error', { error });
        return;
      } else {
        this.logger.error(
          `Error Sending Message: ${error.message}`,
          error.stack
        );
        socket.emit('error', { message: 'An unexpected error occurred.' });
      }
    }
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('message_modify')
  public async handleEditMessage(socket: Socket, values: any) {
    try {
      const decrypt = AppHelperService.decrypt(
        values?.message,
        this.SECRET_KEY
      ) as any;
      const { channelId, memberId, content, serverId, messageId, method } =
        JSON.parse(decrypt);
      if (!channelId || !memberId || !serverId || !method)
        throw new BadRequestException(
          'Channel ID, Member ID, and content are required.'
        );

      const [userJoinedServersCache, message] = await Promise.all([
        this.profileCacheService.getUserJoinedServers(socket.userId),
        this.messageService.getMessageById(messageId),
      ]);

      if (!userJoinedServersCache) {
        throw new NotFoundException('The user does not exist');
      }

      if (!message) {
        throw new NotFoundException('The messageId not found');
      }

      const server = userJoinedServersCache.find(
        (server) => server.id === serverId
      );

      if (!server) {
        throw new NotFoundException('The server does not exist');
      }

      const member = server.members.find((member) => member.id === memberId);

      if (!member) {
        throw new NotFoundException('The member does not exist in the server');
      }

      const channel = server.channels.find(
        (channel) => channel.id === channelId
      );

      if (!channel)
        throw new NotFoundException('The channel does not exist in the server');

      const isOwner = message.memberId === member.id;
      const isAdmin = member.role === 'ADMIN';
      const isModerator = member.role === 'MODERATOR';

      const canEdit = isOwner || isAdmin || isModerator;

      if (!canEdit) {
        throw new UnauthorizedException('Unauthorized');
      }

      if (method === 'DELETE') {
        const messageData = JSON.stringify({
          ...message,
          deleted: true,
          content: 'This message has been deleted',
        });

        const encryptMessage = AppHelperService.encrypt(
          messageData,
          this.SECRET_KEY
        );

        this.server.emit(
          `channels:${channel.id}:message:delete`,
          encryptMessage
        );
        return this.messageService.deleteMessage(message.id);
      } else if (method === 'PATCH') {
        if (!content || content <= 0) {
          throw new BadRequestException('Content is not a valid');
        }

        const updatedAt = new Date();

        const messsgaParams = JSON.stringify({
          ...message,
          content,
          updatedAt,
        });

        const messageData = AppHelperService.encrypt(
          messsgaParams,
          this.SECRET_KEY
        );

        this.server.emit(`channels:${channel.id}:message:update`, messageData);

        return this.messageService.updateMessage(
          message.id,
          content,
          updatedAt
        );
      } else {
        throw new BadRequestException("Method doesn't support");
      }
    } catch (error: any) {
      if (error instanceof HttpException) {
        socket.emit('error', { error });
        return;
      } else {
        this.logger.error(
          `Error Sending Message: ${error.message}`,
          error.stack
        );
        socket.emit('error', { message: 'An unexpected error occurred.' });
      }
    }
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('fetch:messages')
  public async fetchMessages(socket: Socket, values: any) {
    try {
      const [profile, userJoinedServersCache] = await Promise.all([
        this.profileCacheService.getProfileCache(socket.userId),
        this.profileCacheService.getUserJoinedServers(socket.userId),
      ]);

      if (!profile || !userJoinedServersCache)
        throw new NotFoundException('The userId does not exist');

      const decrypt = JSON.parse(
        AppHelperService.decrypt(values.message, this.SECRET_KEY)
      );

      const { cursor } = values?.query;
      const { serverId, channelId } = decrypt;

      if (!serverId || !channelId)
        throw new BadRequestException('Channel ID, Server ID are required.');

      const isExistingServer = userJoinedServersCache.find(
        (server) => server.id === serverId
      );

      if (!isExistingServer)
        throw new NotFoundException('The server does not exist');

      const isExistingChannel = isExistingServer.channels.find(
        (channel) => channel.id === channelId
      );

      if (!isExistingChannel)
        throw new NotFoundException('The channel does not exist');

      const messages = await this.messageService.getMessageChannel({
        take: this.MESSAGE_BATCH,
        skip: 1,
        channelId,
        cursor,
      });

      let nextCursor = null;

      if (messages.length === this.MESSAGE_BATCH) {
        nextCursor = messages[messages.length - 1].id;
      }

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          messages,
          nextCursor,
        }),
        this.SECRET_KEY
      );

      return this.server.emit(
        `messages:server:${serverId}:channel:${channelId}`,
        encryptData
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        socket.emit('error', { error });
        return;
      } else {
        this.logger.error(
          `Error Sending Message: ${error.message}`,
          error.stack
        );
        socket.emit('error', { message: 'An unexpected error occurred.' });
      }
    }
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('fetch:conversation')
  public async fetchConversation(socket: Socket, values: any) {
    try {
      const [profile, userJoinedServers] = await Promise.all([
        this.profileCacheService.getProfileCache(socket.userId),
        this.profileCacheService.getUserJoinedServers(socket.userId),
      ]);

      if (!profile) throw new NotFoundException('The user does not exist');

      const decrypt = JSON.parse(
        AppHelperService.decrypt(values.message, this.SECRET_KEY)
      );

      const { memberTwoId, memberOneId, serverId } = decrypt;

      if (!memberTwoId || !memberOneId || !serverId)
        throw new BadRequestException(
          'The memberOne Id, Id memberTwo Id and serverId are required'
        );

      const server = userJoinedServers.find((server) => server.id === serverId);

      if (!server)
        throw new NotFoundException('The user does not exist this server');

      const memberOne = server.members.find(
        (member) => member.id === memberOneId
      );

      if (!memberOne)
        throw new NotFoundException(
          'The memberOneId does not exist this server'
        );

      const memberTwo = server.members.find(
        (member) => member.id === memberTwoId
      );

      if (!memberTwo)
        throw new NotFoundException(
          'The memberTwoId does not exist this server'
        );

      const conversation = {
        memberOne,
        memberTwo,
      };

      const encryptData = AppHelperService.encrypt(
        JSON.stringify(conversation),
        this.SECRET_KEY
      );

      const key = [memberOneId, memberTwoId];

      key.sort();

      const roomKey = `conversation:${key.join('-')}`;

      socket.join(roomKey);

      this.server.to(roomKey).emit('conversation:data', encryptData);

      this.conversationService.getOrCreateConversation(
        memberOneId,
        memberTwoId
      );
    } catch (error: any) {
      if (error instanceof HttpException) {
        socket.emit('error', { error });
        return;
      } else {
        this.logger.error(
          `Error Sending Message: ${error.message}`,
          error.stack
        );
        socket.emit('error', { message: 'An unexpected error occurred.' });
      }
    }
  }
}
