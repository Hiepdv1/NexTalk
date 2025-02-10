import {
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  OnGatewayInit,
  MessageBody,
} from '@nestjs/websockets';
import { v4 as genuuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { AuthWsMiddleware } from 'src/common/middlewares/AuthWs.middleware';
import {
  BadRequestException,
  HttpException,
  Inject,
  Logger,
  NotFoundException,
  OnModuleInit,
  UseFilters,
  UseGuards,
  UseInterceptors,
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
import { ConversationCacheService } from '../../conversation/services/conversationCache.service';
import { MessageType, Profile } from '@prisma/client';
import { DecryptDataInterceptor } from 'src/providers/interceptors/DecryptData.interceptor';
import { CallService } from '../services/callService.service';
import { WebSocketExceptionFilter } from 'src/common/exceptions/webSocket-exception.filter';
import {
  BaseWsException,
  WsBadRequestException,
  WsNotFoundException,
  WsUnauthorizedException,
} from 'src/errors/WsError';
import {
  CreateProducerDto,
  FetchProducerExistingDto,
  PeerDisconnectedDto,
  RestartProducerDto,
} from '../dto/producer.dto';
import {
  ConsumerRestartDto,
  CreateConsumerForProducerDto,
} from '../dto/consumer.dto';
import {
  IceCandidateConsumerDto,
  IceCandidateProducerDto,
  MediaStatuChangeDto,
} from '../dto/mediaStream.dto';
import { SocketService } from '../services/socket.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ChannelReadDto,
  CreateChannelMessageDto,
  FetchChannelMessageDto,
  MessageChannelModifyDto,
  MessageModifyMethod,
} from '../dto/channel.dto';
import { Queue, QueueEvents } from 'bullmq';
import {
  CreateDirectMessageDto,
  FetchConversationDto,
} from '../dto/conversation.dto';
import { DecryptAndValidatePipe } from '@src/providers/interceptors/DecryptAndValidatePipe.interceptor';
import { MemberService } from '../../members/services/member.service';
import { ChannelReadService } from '../../channelRead/services/channelRead.service';
import { RedisCacheService } from '@src/providers/cache/redis.cache';

@UseFilters(new WebSocketExceptionFilter())
@WebSocketGateway({
  namespace: 'media',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MediaGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  public server: Server;

  private readonly MESSAGE_BATCH: number = 12;

  private readonly logger = new Logger();
  private SECRET_KEY: string;

  private pingInterval: NodeJS.Timeout;
  private pingTimeout: NodeJS.Timeout;

  constructor(
    private readonly socketService: SocketService,
    private readonly authWs: AuthWsMiddleware,
    private readonly authService: AuthService,
    private readonly serverService: ServerService,
    private readonly channelService: ChannelService,
    private readonly messageService: MessageService,
    private readonly configService: ConfigService,
    private readonly serverCacheService: ServerCacheService,
    private readonly conversationService: ConversationService,
    private readonly conversationCacheService: ConversationCacheService,
    private readonly memberService: MemberService,
    private readonly channelReadService: ChannelReadService,
    private readonly redisCache: RedisCacheService,
    @InjectQueue('ChannelMessage') private readonly channelMessageQueue: Queue,
    @InjectQueue('DirectMessage') private readonly directMessageQueue: Queue,
    @InjectQueue('ChannelRead') private readonly channelReadQueue: Queue,
    @Inject('CHANNEL_READ_QUEUE_EVENTS')
    private readonly channelReadQueueEvents: QueueEvents,

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
        socket.emit('error', {
          message: 'Unauthorized access. Token verification failed.',
        });
        socket.disconnect();
        return;
      }

      await this.socketService.handleConnection(socket, this.server); // 23h;

      const SERVER_STUNS = this.callService.GetTwilioStunServers();

      const encryptMessage = AppHelperService.encrypt(
        JSON.stringify(SERVER_STUNS),
        this.SECRET_KEY
      );

      socket.emit('STUN:SERVERS', encryptMessage);

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

        this.server.emit('leave-room-disconnected', encryptMessage);
      }
    } catch (err: unknown) {
      if (err instanceof BaseWsException) {
        socket.emit('error', err);
      }
    }
  }

  async onModuleInit() {
    await this.callService.CreateTwilioToken();

    setInterval(async () => {
      await this.callService.CreateTwilioToken();
      const SERVER_STUNS = this.callService.GetTwilioStunServers();

      const encryptMessage = AppHelperService.encrypt(
        JSON.stringify(SERVER_STUNS),
        this.SECRET_KEY
      );

      this.server.emit('STUN:SERVERS:UPDATED', encryptMessage);
    }, 82800000); // 23h
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('send_message')
  public async handleSendChannelMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(CreateChannelMessageDto))
    values: CreateChannelMessageDto
  ) {
    const { channelId, memberId, content, serverId, timestamp } = values;

    let server = await this.serverCacheService.getServerCache(serverId);

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new WsNotFoundException('The server does not exist');
      await this.serverCacheService.setAndOverrideServerCache(
        server.id,
        server
      );
    }

    const channel = server.channels.find((channel) => channel.id === channelId);

    const member = server.members.find((member) => member.id === memberId);

    if (!channel) throw new WsNotFoundException("The channel doesn't exist");

    const message = {
      id: genuuid(),
      content: content,
      channelId: channelId,
      memberId: memberId,
      type: MessageType.TEXT,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify({
        ...message,
        member,
        timestamp,
        serverId: server.id,
      }),
      this.SECRET_KEY
    );

    this.server.emit('chat:message:channel:global', encryptMessage);

    this.channelMessageQueue.add(
      'ChannelMessage',
      {
        values: message,
      },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('message_modify')
  public async handleModifyMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(MessageChannelModifyDto))
    values: MessageChannelModifyDto
  ) {
    try {
      const { channelId, memberId, content, serverId, messageId, method } =
        values;

      const [serverCache, message] = await Promise.all([
        this.serverCacheService.getServerCache(serverId),
        this.messageService.getMessageById(messageId),
      ]);

      let server = serverCache;

      if (!server) {
        server = await this.serverService.getServerById(serverId);
        if (!server) throw new WsNotFoundException('The server does not exist');
        await this.serverCacheService.setAndOverrideServerCache(
          serverId,
          server
        );
      }

      if (!message) {
        throw new WsNotFoundException('The messageId not found');
      }

      const member = server.members.find((member) => member.id === memberId);

      if (!member) {
        throw new WsNotFoundException(
          'The member does not exist in the server'
        );
      }

      const channel = server.channels.find(
        (channel) => channel.id === channelId
      );

      if (!channel)
        throw new WsNotFoundException(
          'The channel does not exist in the server'
        );

      const isOwner = message.memberId === member.id;
      const isAdmin = member.role === 'ADMIN';
      const isModerator = member.role === 'MODERATOR';

      const canEdit = isOwner || isAdmin || isModerator;

      if (!canEdit) {
        throw new WsUnauthorizedException('Unauthorized');
      }

      if (method === MessageModifyMethod.DELETE) {
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

        if (message.type === MessageType.VIDEO) {
          await Promise.all([
            this.messageService.addToTempStoreFile({
              fileId: message.fileId,
              storageType: message.storageType,
              messageType: message.type,
            }),
            this.messageService.addToTempStoreFile({
              fileId: message.posterId,
              storageType: message.storageType,
              messageType: 'IMAGE',
            }),
          ]);
        } else if (message.type !== MessageType.TEXT) {
          await this.messageService.addToTempStoreFile({
            fileId: message.fileId,
            storageType: message.storageType,
            messageType: message.type,
          });
        }

        return await this.messageService.deleteMessage(message.id);
      } else if (method === MessageModifyMethod.PATCH) {
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
  public async fetchMessages(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(FetchChannelMessageDto))
    values: FetchChannelMessageDto
  ) {
    try {
      const { cursor, serverId, channelId } = values;

      if (!serverId || !channelId)
        throw new BadRequestException(
          'The serverId and channelId are required'
        );

      console.log('Fetch message conversation Cursor: ', cursor);

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

      return socket.emit('res-fetch-messages', encryptData);
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
  public async fetchConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(FetchConversationDto))
    values: FetchConversationDto
  ) {
    const { memberTwoId, memberOneId, serverId } = values;

    const [serverCache, conversationCache] = await Promise.all([
      this.serverCacheService.getServerCache(serverId),
      this.conversationCacheService.getConversationCache({ serverId }),
    ]);

    let server = serverCache;

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new WsNotFoundException('The user does not exist');
      await this.serverCacheService.setAndOverrideServerCache(serverId, server);
    }

    const memberOne = server.members.find(
      (member) => member.id === memberOneId
    );

    if (!memberOne)
      throw new WsNotFoundException(
        'The memberOneId does not exist this server'
      );

    const memberTwo = server.members.find(
      (member) => member.id === memberTwoId
    );

    if (!memberTwo)
      throw new WsNotFoundException(
        'The memberTwoId does not exist this server'
      );

    if (conversationCache) {
      let conversation = conversationCache.find(
        (con) =>
          ((con.memberOneId === memberOneId &&
            con.memberTwoId === memberTwoId) ||
            con.memberOneId === memberTwoId) &&
          con.memberTwoId === memberOneId
      );

      if (!conversation) {
        conversation = await this.conversationService.getOrCreateConversation(
          memberOneId,
          memberTwoId
        );

        await this.conversationCacheService.setAndOverrideConversationCache(
          { serverId },
          [...conversationCache, conversation]
        );
      }

      const encryptData = AppHelperService.encrypt(
        JSON.stringify({
          ...conversation,
          memberOne,
          memberTwo,
          directMessages: [],
        }),
        this.SECRET_KEY
      );
      this.server.emit('conversation:updated:global', encryptData);
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

    this.server.emit('conversation:updated:global', encryptData);

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

    const directMessage =
      await this.conversationService.getDirectMessageByConversationId({
        conversationId,
        cursor,
      });

    if (!directMessage)
      throw new NotFoundException('The server does not exist');

    console.log('Fetch Conversation Message: ', directMessage);

    let nextCursor = null;

    if (directMessage.length === this.MESSAGE_BATCH) {
      nextCursor = directMessage[directMessage.length - 1].id;
    }

    const encryptData = AppHelperService.encrypt(
      JSON.stringify({ directMessage, nextCursor }),
      this.SECRET_KEY
    );

    socket.emit('res-fetch-messages', encryptData);
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('send_message_conversation')
  public async handleSendMessageConversation(
    socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(CreateDirectMessageDto))
    values: CreateDirectMessageDto
  ) {
    const { content, memberId, serverId, timestamp, otherMemberId } = values;

    if (memberId == otherMemberId)
      throw new BadRequestException(
        'The memberId and otherMemberId is not the same'
      );

    if (content.length < 1)
      throw new WsBadRequestException(
        'The content must be at least 1 character'
      );

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

    if (!server) {
      server = await this.serverService.getServerById(serverId);
      if (!server) throw new WsNotFoundException('The serverId does not exist');
      await this.serverCacheService.setAndOverrideServerCache(serverId, server);
    }

    if (!conversation) {
      const memberOne = server.members.find((member) => member.id === memberId);
      const memberTwo = server.members.find(
        (member) => member.id === otherMemberId
      );
      const conversationId = genuuid();

      if (!memberOne && !memberTwo)
        throw new WsNotFoundException('The member one or member two not found');

      conversation = await this.conversationService.getOrCreateConversation(
        memberOne.id,
        memberTwo.id,
        conversationId
      );

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
        serverId: server.id,
      }),
      this.SECRET_KEY
    );

    console.log('Emmiting Chat conversation Global Message');

    this.server.emit('chat:conversation:message:global', encryptData);

    this.directMessageQueue.add(
      'DirectMessage',
      {
        values: directMessage,
      },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('channel-read')
  public async handleChannelRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(ChannelReadDto))
    values: ChannelReadDto
  ) {
    const { channelId, serverId } = values;

    const [profile, serverCache] = await Promise.all([
      this.authService.findUserById(socket.userId),
      this.serverCacheService.getServerCache(serverId),
    ]);

    let server = serverCache;

    if (!server) {
      const existingServer = await this.serverService.getServerById(serverId);

      if (!server)
        throw new WsNotFoundException(
          `The serverId ${server.id} does not exist`
        );

      this.serverCacheService.setAndOverrideServerCache(serverId, {
        ...server,
        members: existingServer.members.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ conversationsInitiated, conversationsReceived, ...rest }) => rest
        ),
      });
      server = existingServer;
    }

    const last_read_at = new Date();

    const payload = {
      profileId: profile.id,
      channel_id: channelId,
      last_read_at,
      channel: server.channels,
    };

    this.channelReadQueue.add(
      'ChannelRead',
      {
        values: payload,
      },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    socket.emit('channel-readed', payload);
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
      producers: Array<{
        type: string;
        producerId: string;
        userId: string;
        participantId: string;
      }>;
    }> = [];

    for (const [participantId, producerInfo] of channel.participants) {
      activeProducers.push({
        participantId,
        userId: producerInfo.userId,
        producers: producerInfo.producers.map((producer) => {
          return {
            type: producer.type,
            producerId: producer.id,
            userId: producer.userId,
            participantId,
            kind: producer.kind,
          };
        }),
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
  @SubscribeMessage('producer-restart-required')
  public async RestartProducer(
    socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(RestartProducerDto))
    values: RestartProducerDto
  ) {
    const { channelId, type, sdp, producerId } = values;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException('The channelId not found');

    const participant = channel.participants.get(socket.id);

    if (!participant)
      throw new WsNotFoundException('The participant not found');

    await this.callService.createProducer({
      roomId: channelId,
      socketId: socket.id,
      sdp,
      userId: socket.userId,
      type,
      socket,
      _producerId: producerId,
    });
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('consumer-restart-required')
  public async RestartConsumer(
    socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(ConsumerRestartDto))
    values: ConsumerRestartDto
  ) {
    const { channelId, producerId, consumerId, participantId, sdp } = values;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsBadRequestException('The ChannelId not found');

    await this.callService.createConsumer({
      roomId: channelId,
      participantId,
      sdp,
      producerId,
      socketId: socket.id,
      socket,
      _consumerId: consumerId,
    });
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('create-producer')
  public async handleCreateProducer(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(CreateProducerDto))
    values: CreateProducerDto
  ) {
    const { channelId, sdp, type, producerId } = values;

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
      socket,
      _producerId: producerId,
    });

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
        participantId: socket.id,
        kind: newProducer.kind,
        userId: newProducer.userId,
        type,
      }),
      this.SECRET_KEY
    );

    console.log(
      '------------------------------------------------------ Create Producers ---------------------------------------'
    );
    console.log('Current Channel: ', channel);
    console.log('Current Consumers: ', channel.consumers);
    console.log('Current Producers: ', channel.participants);

    socket.to(channelId).emit('new-producer', encryptNewProducer);
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('create-consumer-for-producer')
  public async handleCreateConsume(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(CreateConsumerForProducerDto))
    values: CreateConsumerForProducerDto
  ) {
    const { channelId, participantId, sdp, producerId, consumerId } = values;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsBadRequestException('The ChannelId not found');

    const consumerData = await this.callService.createConsumer({
      roomId: channelId,
      participantId,
      sdp,
      producerId,
      socketId: socket.id,
      socket,
      _consumerId: consumerId,
    });

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

    socket.to(channelId).emit('leave-room-disconnected', encryptMessage);
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('peer-disconnected')
  public async handlePeerDisconnected(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(PeerDisconnectedDto))
    values: PeerDisconnectedDto
  ) {
    const { channelId, producerId, type } = values;

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
  @SubscribeMessage('ice-candidate-producer')
  public async handleIceCandidateProducer(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(IceCandidateProducerDto))
    values: IceCandidateProducerDto
  ) {
    const { roomId, candidate, producerId } = values;

    await this.callService.AddIceCandidateForProducer({
      roomId,
      candidate,
      producerId,
      socketId: socket.id,
    });
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('ice-candidate-consumer')
  public async handleIceCandidateConsumer(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(IceCandidateConsumerDto))
    values: IceCandidateConsumerDto
  ) {
    const { roomId, candidate, consumerId } = values;
    await this.callService.AddIceCandidateForConsumer({
      roomId,
      candidate,
      consumerId,
      socketId: socket.id,
    });
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('fetch-existing-producers')
  public async handleConsumers(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(FetchProducerExistingDto))
    values: FetchProducerExistingDto
  ) {
    const { channelId, data } = values;

    const channel = this.callService.getChannel(channelId);

    if (!channel) throw new WsNotFoundException("The Channel doesn't exist");

    const listSdpConnectedConsumers = data.map(async (producerConnect) => {
      const existingParticipant = channel.participants.get(
        producerConnect.participantId
      );

      if (!existingParticipant)
        throw new WsNotFoundException('The participantId not found');

      const existingProducer = existingParticipant.producers.find(
        (producer) => producer.id === producerConnect.producerId
      );

      if (!existingProducer)
        throw new NotFoundException('The producerId not found');

      const newConsumer = await this.callService.createConsumer({
        socketId: socket.id,
        participantId: producerConnect.participantId,
        producerId: producerConnect.producerId,
        roomId: channelId,
        sdp: producerConnect.sdp,
        socket,
        _consumerId: producerConnect.consumerId,
      });

      return newConsumer;
    });

    const results = await Promise.all(listSdpConnectedConsumers);

    const filterConsumerConnected = results.map((result) => {
      return {
        sdp: result.sdp,
        kind: result.kind,
        participantId: result.participantId,
        producerId: result.producerId,
        consumerId: result.consumerId,
      };
    });

    const encryptMessage = AppHelperService.encrypt(
      JSON.stringify(filterConsumerConnected),
      this.SECRET_KEY
    );

    socket.emit('broadcasts', encryptMessage);
  }

  @UseGuards(WsCombinedGuard)
  @SubscribeMessage('media-status-change')
  public async handleUpdateMediaStatusChange(
    @ConnectedSocket() socket: Socket,
    @MessageBody(new DecryptAndValidatePipe(MediaStatuChangeDto))
    values: MediaStatuChangeDto
  ) {
    const { channelId, isCamera, isMic } = values;

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
