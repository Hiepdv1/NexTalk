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
  UsePipes,
} from '@nestjs/common';
import { WsCombinedGuard } from 'src/common/guard/WsCombined.guard';
import { AuthService } from '../../auth/services/auth.service';
import { ServerService } from '../../server/services/server.service';
import { ChannelService } from '../../channels/services/channel.service';
import { MessageService } from '../services/message.service';
import { AppHelperService } from 'src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';
import { ConversationService } from '../../conversation/services/conversation.service';
import { DecryptDataPipe } from 'src/common/pipes/Decrypt-Data.pipe';
import { ServerCacheService } from '../../server/services/serverCache.service';
import { NotFoundError } from 'rxjs';
import { ProfileCacheService } from '../../auth/services/profileCache.service';

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
    private readonly configService: ConfigService,
    private readonly serverCacheService: ServerCacheService,
    private readonly conversationService: ConversationService,
    private readonly profileCacheService: ProfileCacheService
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
  @UsePipes(new DecryptDataPipe(['message']))
  @SubscribeMessage('send_message')
  public async handleSendChannelMessage(socket: Socket, values: any) {
    const { channelId, memberId, content, serverId, timestamp } =
      values.message;

    if (!channelId || !memberId || !content || !timestamp)
      throw new BadRequestException(
        'Channel ID, Member ID, timestamp, and content are required.'
      );

    let server = await this.serverCacheService.getServerCache(serverId);

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new NotFoundException('The server does not exist');
      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    }

    const channel = server.channels.find((channel) => channel.id === channelId);

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

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify({
        ...message,
        member,
        timestamp,
      }),
      this.SECRET_KEY
    );

    this.server.emit(`chat:${channelId}:messages`, encryptMessage);

    await this.messageService.CreateMessage(message).catch((error) => {
      this.logger.error('Error saving message:', error);
    });
  }

  @UseGuards(WsCombinedGuard)
  @UsePipes(new DecryptDataPipe(['message']))
  @SubscribeMessage('message_modify')
  public async handleEditMessage(socket: Socket, values: any) {
    try {
      const { channelId, memberId, content, serverId, messageId, method } =
        values.message;
      if (!channelId || !memberId || !serverId || !method)
        throw new BadRequestException(
          'Channel ID, Member ID, Server ID, Message ID, Method and content are required.'
        );

      const [serverCache, message] = await Promise.all([
        this.serverCacheService.getServerCache(serverId),
        this.messageService.getMessageById(messageId),
      ]);

      let server = serverCache;

      if (!server) {
        server = await this.serverService.getServerById(serverId);
        if (!server) throw new NotFoundError('The server does not exist');
        await this.serverCacheService.setAndOverrideServerCache(
          serverId,
          server
        );
      }

      if (!message) {
        throw new NotFoundException('The messageId not found');
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
      const { cursor, serverId, channelId } = values?.query;

      if (!serverId || !channelId)
        throw new BadRequestException(
          'The serverId and channelId are required'
        );

      const serverCache =
        await this.serverCacheService.getServerCache(serverId);

      let server = serverCache;
      if (!server) {
        server = await this.serverService.getServerById(serverId);
        if (!server) throw new NotFoundError('The server does not exist');
        await this.serverCacheService.setAndOverrideServerCache(
          serverId,
          server
        );
      }

      const channel = server.channels.find(
        (channel) => channel.id === channelId
      );

      if (!channel) throw new NotFoundException('The channel does not exist');

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
  @UsePipes(new DecryptDataPipe(['message']))
  @SubscribeMessage('fetch:conversation')
  public async fetchConversation(socket: Socket, values: any) {
    const { memberTwoId, memberOneId, serverId } = values.message;

    if (!memberTwoId || !memberOneId || !serverId)
      throw new BadRequestException(
        'The memberOne Id, Id memberTwo Id and serverId are required'
      );

    let server = await this.serverCacheService.getServerCache(serverId);

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new NotFoundException('The user does not exist');
      await this.serverCacheService.setAndOverrideServerCache(serverId, server);
    }

    const memberOne = server.members.find(
      (member) => member.id === memberOneId
    );

    if (!memberOne)
      throw new NotFoundException('The memberOneId does not exist this server');

    const memberTwo = server.members.find(
      (member) => member.id === memberTwoId
    );

    if (!memberTwo)
      throw new NotFoundException('The memberTwoId does not exist this server');

    const isExistConversation = memberOne.conversationsInitiated.find((con) => {
      return con.memberOneId === memberOneId || con.memberOneId === memberTwoId;
    });

    if (isExistConversation) {
      const key = [memberOneId, memberTwoId];
      key.sort();

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          ...isExistConversation,
          memberOne,
          memberTwo,
        }),
        this.SECRET_KEY
      );
      this.server.emit(`conversation:${key.join('-')}`, encryptData);
      return;
    }

    const id = genuuid();

    const conversation = {
      id,
      memberOneId: memberOne.id,
      memberTwoId: memberTwo.id,
      directMessages: [],
    };

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({
        ...conversation,
        memberOne: {
          ...memberOne,
          conversationsInitiated: [
            ...memberOne.conversationsInitiated,
            conversation,
          ],
        },
        memberTwo: {
          ...memberTwo,
          conversationsInitiated: [
            ...memberTwo.conversationsInitiated,
            conversation,
          ],
        },
      }),
      this.SECRET_KEY
    );

    const key = [memberOneId, memberTwoId];

    key.sort();

    this.server.emit(`conversation:${key.join('-')}`, encryptData);

    const conversationCache = {
      id,
      memberOneId,
      memberTwoId,
    };

    memberOne.conversationsInitiated.push(conversationCache);
    memberTwo.conversationsInitiated.push(conversationCache);

    await Promise.all([
      this.conversationService.createConversation(memberOneId, memberTwoId, id),
      this.serverCacheService.setAndOverrideServerCache(serverId, server),
    ]);
  }
}
