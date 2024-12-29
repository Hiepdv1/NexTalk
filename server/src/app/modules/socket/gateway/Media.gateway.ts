import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { v4 as genuuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { AuthWsMiddleware } from 'src/common/middlewares/AuthWs.middleware';
import {
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseFilters,
  UseGuards,
  UseInterceptors,
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
import { ServerCacheService } from '../../server/services/serverCache.service';
import { NotFoundError } from 'rxjs';
import { ProfileCacheService } from '../../auth/services/profileCache.service';
import { ConversationCacheService } from '../../conversation/services/conversationCache.service';
import { MessageType, Profile } from '@prisma/client';
import { ChatService } from '../services/chat.service';
import { DecryptDataInterceptor } from 'src/providers/interceptors/DecryptData.interceptor';
import { DecryptDataPipe } from 'src/common/pipes/Decrypt-Data.pipe';
import { CallService } from '../services/callService.service';
import { WebSocketExceptionFilter } from 'src/common/exceptions/webSocket-exception.filter';
import {
  BaseWsException,
  WsBadRequestException,
  WsNotFoundException,
  WsUnauthorizedException,
} from 'src/errors/WsError';
import { CreateProducerDto, PeerDisconnectedDto } from '../dto/producer.dto';
import { WsValidationInterceptor } from 'src/providers/interceptors/WsValidation.interceptor';
import { CreateConsumerForProducerDto } from '../dto/consumer.dto';
import { MediaStatuChangeDto } from '../dto/mediaStream.dto';

@UseFilters(new WebSocketExceptionFilter())
@WebSocketGateway({
  namespace: 'media',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MediaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
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
    private readonly conversationCacheService: ConversationCacheService,
    private readonly profileCacheService: ProfileCacheService,
    private readonly callService: CallService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }
  afterInit() {
    this.logger.debug('Init');
  }

  handleConnection(socket: Socket) {
    this.authWs.use(socket, async (err) => {
      if (err) {
        socket.emit('unauthorized_error', {
          message: 'Unauthorized access. Token verification failed.',
        });
        socket.disconnect();
        return;
      }

      await this.socketService.handleConnection(socket);

      // this.startPing(socket);
      console.log('Client connected:', socket.id);
      console.log('Is connected:', socket.connected);
    });
  }

  async handleDisconnect(socket: Socket) {
    try {
      clearInterval(this.pingInterval);
      clearTimeout(this.pingTimeout);
      const channelId = socket.data?.channelId;
      if (channelId) {
        this.callService.leaveRoom(channelId, socket.id);
        const encryptMessage = AppHelperService.encrypt(
          JSON.stringify({
            participantId: socket.id,
          }),
          this.SECRET_KEY
        );

        socket.to(channelId).emit('peer-disconnected', encryptMessage);
      }
    } catch (err: unknown) {
      if (err instanceof BaseWsException) {
        socket.emit('error', err);
      }
    }
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

    if (memberOneId === memberTwoId)
      throw new BadRequestException(
        'The memberOneId and memberTwoId does not same'
      );

    // eslint-disable-next-line prefer-const
    let [server, conversationCache] = await Promise.all([
      this.serverCacheService.getServerCache(serverId),
      this.conversationCacheService.getConversationCache({ serverId }),
    ]);

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

    if (conversationCache) {
      const key = [memberOneId, memberTwoId];
      key.sort();

      const conversation = conversationCache.find(
        (con) =>
          ((con.memberOneId === memberOneId ||
            con.memberTwoId === memberOneId) &&
            con.memberOneId === memberTwoId) ||
          con.memberTwoId === memberTwoId
      );

      if (!conversation)
        throw new NotFoundException('The conversation does not exist');

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          ...conversation,
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
        memberOne,
        memberTwo,
      }),
      this.SECRET_KEY
    );

    const key = [memberOneId, memberTwoId];

    key.sort();

    this.server.emit(`conversation:${key.join('-')}`, encryptData);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile: m1, ...restM1 } = memberOne;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile: m2, ...restM2 } = memberTwo;

    conversationCache.push({
      id,
      memberOne: restM1,
      memberTwo: restM2,
      memberOneId: memberOne.id,
      memberTwoId: memberTwo.id,
    });

    await Promise.all([
      this.conversationService.getOrCreateConversation(
        memberOneId,
        memberTwoId,
        id
      ),
      this.conversationCacheService.setAndOverrideConversationCache(
        {
          serverId,
        },
        conversationCache
      ),
    ]);
  }
  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('fetch:conversation:message')
  public async fetchConversationMessage(socket: Socket, values: any) {
    const { serverId, conversationId, cursor } = values?.query;

    if (!serverId || !conversationId) {
      throw new BadRequestException(
        'The server Id and Conversation Id are required'
      );
    }

    const serverCache = await this.serverCacheService.getServerCache(serverId);

    let server = serverCache;

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new BadRequestException('The server does not exist');
      await this.serverCacheService.setAndOverrideServerCache(serverId, server);
    }

    const directMessage = await this.conversationService.getDirectMessageById({
      conversationId,
      cursor,
    });

    if (!directMessage)
      throw new NotFoundException('The server does not exist');

    const encryptData = AppHelperService.encrypt(
      JSON.stringify(directMessage),
      this.SECRET_KEY
    );

    this.server.emit(
      `server:${serverId}:conversation:${conversationId}:message`,
      encryptData
    );
  }

  @UseGuards(WsCombinedGuard)
  @UsePipes(new DecryptDataPipe(['message']))
  @SubscribeMessage('send_message_conversation')
  public async handleSendMessageConversation(socket: Socket, values: any) {
    const { content, memberId, serverId, timestamp, otherMemberId } =
      values.message;

    if (!content || !memberId || !serverId || !timestamp || !otherMemberId) {
      throw new BadRequestException(
        'The content, memberId, serverId, timestamp and otherMemberId are required'
      );
    }

    if (memberId == otherMemberId)
      throw new BadRequestException(
        'The memberId and otherMemberId is not the same'
      );

    if (content.length < 1)
      throw new BadRequestException('The content must be at least 1 character');

    const [serverCache, conversationCache] = await Promise.all([
      this.serverCacheService.getServerCache(serverId),
      this.conversationCacheService.getConversationCache({ serverId }),
    ]);

    let server = serverCache;

    let conversation = conversationCache.find(
      (con) =>
        (con.memberOne.id === memberId && con.memberTwo.id === otherMemberId) ||
        (con.memberOne.id === otherMemberId && con.memberTwo.id === memberId)
    );

    console.log('Existing Conversation: ', conversation);

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new NotFoundException('The serverId does not exist');
      await this.serverCacheService.setAndOverrideServerCache(serverId, server);
    }

    if (!conversation) {
      const memberOne = server.members.find((member) => member.id === memberId);
      const memberTwo = server.members.find(
        (member) => member.id === otherMemberId
      );
      const conversationId = genuuid();

      if (!memberOne && !memberTwo)
        throw new NotFoundException('The member one or member two not found');

      conversation = await this.conversationService.getOrCreateConversation(
        memberOne.id,
        memberTwo.id,
        conversationId
      );

      console.log('Find Db COnversation');

      conversationCache.push({
        id: conversation.id,
        memberOne,
        memberTwo,
        memberOneId: memberOne.id,
        memberTwoId: memberTwo.id,
      });

      await this.conversationCacheService.setAndOverrideConversationCache(
        {
          serverId,
        },
        conversationCache
      );
    }

    const member = server.members.find((member) => member.id === memberId);

    if (!member)
      throw new NotFoundException('The memberId does not exist this server');

    const messageId = genuuid();

    const createdAt = new Date();

    const directMessage = {
      id: messageId,
      content,
      memberId,
      conversationId: conversation.id,
      type: MessageType.TEXT,
      createdAt,
      updatedAt: createdAt,
    };

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({
        ...directMessage,
        member,
        timestamp,
      }),
      this.SECRET_KEY
    );

    this.server.emit(`chat:${server.id}:conversation:message`, encryptData);

    await this.conversationService.createDirectMessage(directMessage);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(new DecryptDataInterceptor(['message']))
  @SubscribeMessage('initialize-channel')
  public async handleInitializeChannel(@ConnectedSocket() socket: Socket) {
    const { channelId } = socket.data.decrypted?.message;

    if (!channelId) {
      throw new WsBadRequestException('channelId is required');
    }

    const currentProfile = await this.authService.findUserById(socket.userId);

    if (!currentProfile) throw new WsUnauthorizedException('Unauthorized');

    await this.callService.joinRoom({
      roomId: channelId,
      socketId: socket.id,
      userId: currentProfile.userId,
    });

    const channel = this.callService.getChannel(channelId);

    console.log('CurrentChannel: ', channel);

    if (!channel) throw new WsNotFoundException('The channelId not found');

    socket.data.channelId = channelId;
    socket.join(channelId);

    console.log('CurrentProfile: ', currentProfile);

    const encryptNewProfile = AppHelperService.encrypt(
      JSON.stringify({
        profile: currentProfile,
        participantId: socket.id,
      }),
      this.SECRET_KEY
    );

    const activeProducers: Array<{
      participantId: string;
      userId?: string;
      profile?: Profile;
    }> = [];

    for (const [participantId, producerInfo] of channel.participants) {
      activeProducers.push({
        participantId,
        userId: producerInfo.userId,
      });
    }

    const producerIds = [
      ...new Set(
        activeProducers
          .map((producer) => producer.userId)
          .filter((producer) => producer)
      ),
    ];

    const profiles = await this.authService.findManyUsersByUserId(producerIds);

    if (profiles.length !== producerIds.length) {
      const missingUserIds = producerIds.filter((userId) =>
        profiles.some((p) => p.userId !== userId)
      );
      throw new WsNotFoundException(
        `Profiles not found for the following userIds: ${missingUserIds.join('')}`
      );
    }

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    activeProducers.forEach((a) => {
      a.profile = profileMap.get(a.userId);
    });

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({
        channelId,
        activeProducers,
      }),
      this.SECRET_KEY
    );

    console.log('Channel: ', channel);

    socket.emit('joined-room', encryptData);
    socket.to(channelId).emit('new-member:info', encryptNewProfile);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(
    new DecryptDataInterceptor(['message']),
    new WsValidationInterceptor(CreateProducerDto)
  )
  @SubscribeMessage('create-producer')
  public async handleCreateProducer(@ConnectedSocket() socket: Socket) {
    const { channelId, sdp, type } = socket.data.validatedMessage;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException('The channelId not found');

    const participant = channel.participants.get(socket.id);

    if (!participant)
      throw new WsNotFoundException('The participant not found');

    const newProducer = await this.callService.createProducer({
      roomId: channelId,
      socketId: socket.id,
      sdp,
      userId: socket.userId,
      type,
    });

    const peerProducer = newProducer.peer;

    newProducer.peer.oniceconnectionstatechange = () => {
      const state = peerProducer.iceConnectionState;

      if (state === 'failed') {
        socket.emit('producer-failed', {
          message: 'Consumer failed',
          producerId: newProducer.senderId,
          kind: newProducer.kind,
        });
      }
    };

    const encryptProducer = AppHelperService.encrypt(
      JSON.stringify({
        kind: newProducer.kind,
        participantId: newProducer.senderId,
        sdp: newProducer.sdp,
        userId: newProducer.userId,
        producerId: newProducer.id,
      }),
      this.SECRET_KEY
    );

    socket.emit('created-producer', encryptProducer);

    const encryptNewProducer = AppHelperService.encrypt(
      JSON.stringify({
        producerId: newProducer.id,
        participantId: newProducer.senderId,
        kind: newProducer.kind,
        userId: newProducer.userId,
        type,
      }),
      this.SECRET_KEY
    );

    socket.to(channelId).emit('new-producer', encryptNewProducer);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(
    new DecryptDataInterceptor(['message']),
    new WsValidationInterceptor(CreateConsumerForProducerDto)
  )
  @SubscribeMessage('create-consumer-for-producer')
  public async handleCreateConsume(@ConnectedSocket() socket: Socket) {
    const { channelId, participantId, sdp, kind, producerId } = socket.data
      .validatedMessage as CreateConsumerForProducerDto;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsBadRequestException('The ChannelId not found');

    const consumerData = await this.callService.createConsumer({
      roomId: channelId,
      participantId,
      sdp,
      kind,
      producerId,
      socketId: socket.id,
    });

    consumerData.peer.oniceconnectionstatechange = () => {
      if (consumerData.peer.iceConnectionState === 'failed') {
        socket.emit('consumer-failed', {
          message: 'Consumer failed',
          producerId: consumerData.participantId,
          kind: consumerData.kind,
          userId: consumerData.userId,
        });
      }
    };

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({
        sdp: consumerData.sdp,
        kind: consumerData.kind,
        participantId,
        producerId,
        consumerId: consumerData.consumerId,
      }),
      this.SECRET_KEY
    );
    socket.emit('consumer-connected', encryptData);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(new DecryptDataInterceptor(['message']))
  @SubscribeMessage('leave-room')
  public handleLeaveRoom(@ConnectedSocket() socket: Socket) {
    const { channelId } = socket.data.decrypted?.message;

    if (!channelId) {
      throw new WsBadRequestException('channelId is required');
    }

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException('The ChannelId not found');
    this.callService.leaveRoom(channelId, socket.id);

    socket.leave(channelId);

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify({
        participantId: socket.id,
      }),
      this.SECRET_KEY
    );

    socket.to(channelId).emit('peer-disconnected', encryptMessage);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(new DecryptDataInterceptor(['message']))
  @SubscribeMessage('peer-disconnected')
  public async handlePeerDisconnected(@ConnectedSocket() socket: Socket) {
    const { channelId, producerId, type } = socket.data.decrypted
      ?.message as PeerDisconnectedDto;

    const channel = this.callService.getChannel(channelId);

    if (!channel)
      throw new WsBadRequestException("The user doesn't have channel");

    const participant = channel.participants.get(socket.id);

    if (!participant)
      throw new WsNotFoundException("The participant doesn't exist");

    const producer = participant.producers.find((p) => p.id === producerId);

    if (!producer)
      throw new WsNotFoundException("The producerId doesn't not exist");

    participant.producers = participant.producers.filter(
      (p) => p.id !== producerId
    );

    producer.peer.close();

    console.log('Producer-Disconnected: ', producer);

    for (const [participantId, info] of channel.consumers) {
      const consumer = info.find((i) => i.producerId === producerId);

      if (consumer) {
        consumer.peer.close();
        channel.consumers.delete(participantId);
        console.log('Consumer Disonnected: ', participantId);
      }
    }

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify({
        participantProducerId: socket.id,
        producerId,
        type,
      }),
      this.SECRET_KEY
    );

    socket.to(channelId).emit('producer-disconnected', encryptMessage);
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(new DecryptDataInterceptor(['message']))
  @SubscribeMessage('fetch-existing-producers')
  public async handleConsumers(@ConnectedSocket() socket: Socket) {
    const { channelId, data } = socket.data.decrypted?.message;

    if (!channelId || !data) {
      throw new WsBadRequestException('channelId and data are required');
    }

    const participants = this.callService.getProducers(channelId).values();

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException('The channelId not found');

    const consumers = [];

    for (const participant of participants) {
      for (const producer of participant.producers) {
        if (producer.senderId !== socket.id) {
          const producerData = data[producer.senderId];
          if (producerData) {
            const consumer = this.callService.createConsumer({
              roomId: channelId,
              participantId: producer.senderId,
              sdp: producerData.sdp,
              kind: producerData.kind,
              producerId: producer.id,
              socketId: socket.id,
            });

            consumers.push(consumer);
          } else {
            console.log('Producer not found');
          }
        }
      }
    }

    const result = await Promise.all(consumers);

    if (result.length > 0) {
      const encryptData = AppHelperService.encrypt(
        JSON.stringify(result),
        this.SECRET_KEY
      );

      socket.emit('consumers-created', encryptData);
    }

    result.forEach((consumer) => {
      consumer.peer.oniceconnectionstatechange = () => {
        if (consumer.peer.iceConnectionState === 'failed') {
          socket.emit('consumer-failed', {
            message: 'Consumer failed',
            producerId: consumer.participantId,
            kind: consumer.kinds.join('/'),
          });
        }
      };
    });
  }

  @UseGuards(WsCombinedGuard)
  @UseInterceptors(
    new DecryptDataInterceptor(['message']),
    new WsValidationInterceptor(MediaStatuChangeDto)
  )
  @SubscribeMessage('media-status-change')
  public async handleUpdateMediaStatusChange(
    @ConnectedSocket() socket: Socket
  ) {
    const { channelId, isCamera, isMic } = socket.data
      .validatedMessage as MediaStatuChangeDto;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException('The ChannelId not found');

    const participant = channel.participants.get(socket.id);

    if (!participant)
      throw new BadRequestException("The user doesn't exist this channel");

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify({
        isCamera,
        isMic,
        participantId: socket.id,
      }),
      this.SECRET_KEY
    );

    socket.to(channelId).emit('updated-status-change', encryptMessage);
  }
}
