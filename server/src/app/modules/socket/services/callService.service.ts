import { Injectable, Logger } from '@nestjs/common';
import { Producer, Room } from '../dto/channel.dto';
import wrtc from 'wrtc';
import { v4 as genuid } from 'uuid';
import { WsNotFoundException } from 'src/errors/WsError';
import { TwilioService } from 'nestjs-twilio';
import { Socket } from 'socket.io';
import { AppHelperService } from '@src/common/helpers/app.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CallService {
  private readonly ChannelStore: Map<string, Room> = new Map();
  private readonly logger = new Logger(CallService.name);
  private SERVER_STUNS: Array<{
    url?: string;
    urls: string;
    username?: string;
    credential?: string;
  }> = [];

  private PEER_CONFIG: RTCConfiguration = {
    iceServers: this.SERVER_STUNS,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
  };

  private SECRET_KEY: string;

  constructor(
    private readonly twilioService: TwilioService,
    private readonly configService: ConfigService
  ) {
    this.SECRET_KEY = configService.get<string>('HASH_MESSAGE_SECRET_KEY');
  }

  public async CreateTwilioToken() {
    try {
      const token = await this.twilioService.client.tokens.create();

      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun2.1.google.com:19302' },
      ];

      this.SERVER_STUNS = [...(token.iceServers as any), ...iceServers];

      this.SERVER_STUNS.forEach((server: Record<string, any>) => {
        if (server.url) {
          delete server.url;
        }
      });

      this.PEER_CONFIG.iceServers = this.SERVER_STUNS;
      console.log('PEER_CONFIG: ', this.PEER_CONFIG);

      console.log('Twilio Token Created:', this.SERVER_STUNS);
    } catch (error) {
      console.error('Failed to create Twilio token:', error);
    }
  }

  public GetTwilioStunServers() {
    return this.SERVER_STUNS;
  }

  public getMembersOnline(channelId: string) {
    const channel = this.ChannelStore.get(channelId);

    if (!channel) return 0;

    return channel.participants.size;
  }

  public async joinRoom({
    roomId,
    socketId,
    userId,
  }: {
    roomId: string;
    socketId: string;
    userId: string;
  }) {
    let room = this.ChannelStore.get(roomId);

    if (!room) {
      room = {
        roomId,
        participants: new Map(),
        consumers: new Map(),
      };

      room.participants.set(socketId, {
        userId,
        producers: [],
      });

      this.ChannelStore.set(roomId, room);
    }

    if (!room.participants.has(socketId)) {
      room.participants.set(socketId, {
        userId,
        producers: [],
      });
    }
  }

  public getProducers(roomId: string) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    return room.participants;
  }

  public getChannel(roomId: string) {
    const channel = this.ChannelStore.get(roomId);

    if (!channel) throw new WsNotFoundException('The channel not found');

    return channel;
  }

  private handleIceCandidateConsumer({
    event,
    roomId,
    socket,
    producerId,
    userId,
    participantId,
    consumerId,
  }: {
    event: RTCPeerConnectionIceEvent;
    roomId: string;
    socket: Socket;
    producerId: string;
    userId: string;
    participantId: string;
    consumerId: string;
  }) {
    if (event.candidate) {
      const candidateData = {
        type: 'candidate',
        candidate: event.candidate,
        roomId,
        target: participantId,
        producerId,
        consumerId,
        userId,
      };

      const encryptedIceCandidate = AppHelperService.encrypt(
        JSON.stringify(candidateData),
        this.SECRET_KEY
      );

      socket.emit('ice-candidate-consumer', encryptedIceCandidate);
    }
  }

  private handleIceCandidateProducer({
    event,
    roomId,
    socket,
    producerId,
    userId,
  }: {
    event: RTCPeerConnectionIceEvent;
    roomId: string;
    socket: Socket;
    producerId: string;
    userId: string;
  }) {
    if (event.candidate) {
      const candidateData = {
        type: 'candidate',
        candidate: event.candidate,
        roomId,
        target: socket.id,
        producerId,
        userId,
      };

      const encryptedIceCandidate = AppHelperService.encrypt(
        JSON.stringify(candidateData),
        this.SECRET_KEY
      );

      socket.emit('ice-candidate-producer', encryptedIceCandidate);
    }
  }

  private handleConnectionFailure(peer: RTCPeerConnection, retryCount = 0) {
    const MAX_RETRIES = 3;

    if (retryCount >= MAX_RETRIES) {
      peer.close();
      return;
    }

    const restart = () => {
      try {
        peer.restartIce();
        this.logger.debug(`ICE restart attempt ${retryCount + 1}`);
      } catch {
        this.handleConnectionFailure(peer, retryCount + 1);
      }
    };

    setTimeout(restart, 2000 * Math.pow(2, retryCount));
  }
  private onTrackProducer({
    e,
    producerId,
    socketId,
    userId,
    peer,
    type,
    participants,
  }: {
    e: RTCTrackEvent;
    producerId: string;
    socketId: string;
    userId: string;
    peer: RTCPeerConnection;
    type: string;
    participants: {
      userId: string;
      producers: Producer[];
    };
  }) {
    const producer = this.handleTrackEvent(e, producerId);

    if (!producer.streams || producer.streams.length === 0) {
      console.error('No stream in producer:', producer);
      return;
    }

    const existingProducer = participants.producers.find(
      (p) => p.senderId === socketId && p.id === producer.id
    );

    if (existingProducer) {
      const combinedMediaStream = new wrtc.MediaStream() as MediaStream;

      producer.streams.forEach((stream) => {
        stream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') {
            combinedMediaStream.addTrack(track);
          }
        });
      });

      existingProducer.streams.forEach((stream) => {
        stream.getTracks().forEach((track) => {
          if (track.readyState !== 'ended') {
            combinedMediaStream.addTrack(track);
          }
        });
      });

      existingProducer.streams = [combinedMediaStream];
      existingProducer.kind = producer.kind;
      existingProducer.enabled = producer.enabled;
    } else {
      participants.producers.push({
        ...producer,
        senderId: socketId,
        userId,
        peer,
        type,
      });
    }
  }

  private async ClosePeerProducer({
    socketId,
    producerId,
    roomId,
  }: {
    socketId: string;
    producerId: string;
    roomId: string;
  }) {
    const room = this.ChannelStore.get(roomId);

    if (!room) return;

    const participants = room.participants.get(socketId);

    if (!participants) return;

    const producerIndex = participants.producers.findIndex(
      (p) => p.id === producerId
    );

    if (producerIndex === -1) return;

    participants.producers[producerIndex].peer.close();

    this.logger.debug(
      `Close Peer Producer: ${participants.producers[producerIndex].id}`
    );
    participants.producers.splice(producerIndex, 1);
  }

  private async ClosePeerConsumer({
    consumerId,
    roomId,
    senderId,
  }: {
    consumerId: string;
    senderId: string;
    roomId: string;
  }) {
    const room = this.ChannelStore.get(roomId);

    if (!room) return;

    const consumers = room.consumers.get(senderId);

    if (!consumers) return;

    const consumerIndex = consumers.findIndex((c) => c.id === consumerId);

    if (consumerIndex === -1) return;

    consumers[consumerIndex].peer.close();
    this.logger.debug(`Close Peer Producer: ${consumers[consumerIndex].id}`);
    consumers.splice(consumerIndex, 1);
  }

  public async createProducer({
    roomId,
    socketId,
    sdp,
    userId,
    type,
    socket,
    _producerId,
  }: {
    roomId: string;
    socketId: string;
    sdp: RTCSessionDescriptionInit;
    userId: string;
    type: string;
    socket: Socket;
    _producerId?: string;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    const participants = room.participants.get(socketId);

    if (!participants) {
      throw new WsNotFoundException('Participants not found');
    }

    const producerId = _producerId || genuid();

    const existingProducerIndex = participants.producers.findIndex(
      (p) => p.id === producerId
    );

    if (existingProducerIndex !== -1) {
      this.logger.debug('Remove old peer producer');
      const oldProducer = participants.producers[existingProducerIndex];
      oldProducer.peer.close();
      participants.producers.splice(existingProducerIndex, 1);
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection(
      this.PEER_CONFIG
    );

    let kind: string;

    if (type === 'screen') {
      kind = 'video/audio';
    } else {
      kind = type;
    }

    const mediaStream = new wrtc.MediaStream();

    participants.producers.push({
      id: producerId,
      streams: [mediaStream],
      enabled: false,
      kind,
      peer,
      senderId: socket.id,
      trackId: mediaStream.id,
      type,
      userId,
    });

    peer.onicecandidate = (event) => {
      this.handleIceCandidateProducer({
        event,
        roomId,
        socket,
        producerId,
        userId,
      });
    };

    peer.ontrack = (e: RTCTrackEvent) => {
      this.onTrackProducer({
        e,
        producerId,
        socketId: socket.id,
        peer,
        type,
        participants,
        userId,
      });
    };

    peer.onconnectionstatechange = () => {
      this.logger.debug(`Connection state changed: ${peer.connectionState}`);
      if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected'
      ) {
        this.handleConnectionFailure(peer);
        const encrypted = AppHelperService.encrypt(
          JSON.stringify({ producerId, type }),
          this.SECRET_KEY
        );
        socket.emit('producer-ice-restart-required', encrypted);
      }
      if (peer.connectionState === 'closed') {
        this.ClosePeerProducer({
          socketId,
          producerId,
          roomId,
        });
      }
    };

    const offer = new wrtc.RTCSessionDescription(sdp);
    await peer.setRemoteDescription(offer);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    const payload = {
      sdp: peer.localDescription,
      kind,
      senderId: socketId,
      peer,
      userId,
      id: producerId,
    };

    return payload;
  }

  public async AddIceCandidateForConsumer({
    candidate,
    roomId,
    socketId,
    consumerId,
  }: {
    candidate: RTCIceCandidate | RTCIceCandidate[];
    roomId: string;
    socketId: string;
    consumerId: string;
  }) {
    const channel = this.ChannelStore.get(roomId);

    if (!channel)
      throw new WsNotFoundException(`Channel ${roomId} was not found`);

    const consumer = channel.consumers.get(socketId);

    if (!consumer)
      throw new WsNotFoundException(`The consumer ${socketId} was not found`);

    const consumerPeer = consumer.find((c) => c.id === consumerId);

    if (!consumerPeer)
      throw new WsNotFoundException(
        `The consumer ${consumerId} was not found or Connection Not Ready: The remote description has not been set yet. Please wait a few seconds for the connection setup to complete before sending ICE candidates`
      );

    if (Array.isArray(candidate)) {
      for (const ice of candidate) {
        const newIceCandidate = new wrtc.RTCIceCandidate(ice);

        await consumerPeer.peer.addIceCandidate(newIceCandidate);
      }
    } else {
      const newIceCandidate = new wrtc.RTCIceCandidate(candidate);

      await consumerPeer.peer.addIceCandidate(newIceCandidate);
    }
    this.logger.debug('Icecandidate consumer added');
  }

  public async AddIceCandidateForProducer({
    candidate,
    roomId,
    socketId,
    producerId,
  }: {
    candidate: RTCIceCandidate | RTCIceCandidate[];
    roomId: string;
    socketId: string;
    producerId: string;
  }) {
    const channel = this.ChannelStore.get(roomId);

    if (!channel)
      throw new WsNotFoundException(`Channel ${roomId} was not found`);

    const participant = channel.participants.get(socketId);

    if (!participant)
      throw new WsNotFoundException(
        `The participant ${socketId} was not found`
      );

    const producer = participant.producers.find((p) => p.id === producerId);

    if (!producer)
      throw new WsNotFoundException(
        `The producer ${producerId} was not found Or Connection Not Ready: The remote description has not been set yet. Please wait a few seconds for the connection setup to complete before sending ICE candidates`
      );

    if (Array.isArray(candidate)) {
      for (const ice of candidate) {
        const newIceCandidate = new wrtc.RTCIceCandidate(ice);
        await producer.peer.addIceCandidate(newIceCandidate);
      }
    } else {
      const newIceCandidate = new wrtc.RTCIceCandidate(candidate);
      await producer.peer.addIceCandidate(newIceCandidate);
    }
    this.logger.debug('Icecandidate producer added');
  }

  public async createConsumer({
    socketId,
    roomId,
    participantId,
    sdp,
    producerId,
    socket,
    _consumerId,
  }: {
    socketId: string;
    roomId: string;
    participantId: string;
    sdp: RTCSessionDescriptionInit;
    producerId: string;
    socket: Socket;
    _consumerId?: string;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    const participants = room.participants.get(participantId);
    if (!participants) {
      throw new WsNotFoundException('Participants not found');
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection(
      this.PEER_CONFIG
    );

    const consumerId = _consumerId || genuid();

    const consumers = room.consumers.get(socket.id);

    if (consumers) {
      const existingConsumerIndex = consumers.findIndex(
        (c) => c.id === consumerId
      );

      if (existingConsumerIndex !== -1) {
        this.logger.debug('Remove old peer consumer');
        const oldProducer = consumers[existingConsumerIndex];
        oldProducer.peer.close();
        consumers.splice(existingConsumerIndex, 1);
      }
    }

    const producer = participants.producers.find((p) => p.id === producerId);

    if (!producer) {
      throw new WsNotFoundException(`${producerId} producer not found`);
    }

    const existingConsumer = room.consumers.get(socket.id);
    const newConsumer = {
      userId: participants.userId,
      peer,
      producerId,
      id: consumerId,
      type: producer.type,
    };

    if (existingConsumer) {
      existingConsumer.push(newConsumer);
    } else {
      room.consumers.set(socketId, [newConsumer]);
    }

    peer.onicecandidate = (event) => {
      this.handleIceCandidateConsumer({
        event,
        roomId,
        socket,
        producerId,
        userId: participants.userId,
        participantId,
        consumerId,
      });
    };

    peer.onconnectionstatechange = () => {
      this.logger.debug(`Connection state changed: ${peer.connectionState}`);
      if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected'
      ) {
        this.handleConnectionFailure(peer);
        const encrypted = AppHelperService.encrypt(
          JSON.stringify({
            producerId,
            consumerId,
            senderId: producer.senderId,
            kind: producer.kind,
          }),
          this.SECRET_KEY
        );
        socket.emit('consumer-ice-restart-required', encrypted);
      }
      if (peer.connectionState === 'closed') {
        this.ClosePeerConsumer({ consumerId, roomId, senderId: participantId });
      }
    };

    producer.streams.forEach((stream) =>
      stream.getTracks().forEach((track) => {
        if (track.readyState !== 'ended') {
          peer.addTrack(track, stream);
        }
      })
    );

    const desc = new wrtc.RTCSessionDescription(sdp);

    await peer.setRemoteDescription(desc);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    return {
      sdp: peer.localDescription,
      kind: producer.kind,
      participantId,
      peer,
      userId: participants.userId,
      type: producer.type,
      consumerId,
      producerId,
    };
  }

  public leaveRoom(channelId: string, socketId: string) {
    const channel = this.ChannelStore.get(channelId);

    if (!channel) {
      throw new WsNotFoundException("The channelId doesn't exist");
    }

    const participant = channel.participants.get(socketId);

    if (!participant) throw new WsNotFoundException('The producer not found');

    const producerIdsToRemove = participant.producers.map((producer) => {
      producer.peer
        .getTransceivers()
        .forEach((transceiver) => transceiver.stop());
      producer.peer.close();
      return producer.id;
    });

    console.log('ProducerIdsRemove: ', producerIdsToRemove);

    channel.participants.delete(socketId);

    channel.consumers.forEach((consumerList, consumerId) => {
      const updatedConsumers = consumerList.filter(
        (consumer) => !producerIdsToRemove.includes(consumer.producerId)
      );

      consumerList
        .filter((consumer) => producerIdsToRemove.includes(consumer.producerId))
        .forEach((consumer) => consumer.peer.close());

      if (updatedConsumers.length === 0) {
        channel.consumers.delete(consumerId);
      } else {
        channel.consumers.set(consumerId, updatedConsumers);
      }
    });

    const currentConsumers = channel.consumers.get(socketId);

    if (currentConsumers && currentConsumers.length > 0) {
      currentConsumers.forEach((consumer) => {
        consumer.peer.close();
      });
    }

    channel.consumers.delete(socketId);

    console.log('Current Consumers: ', channel.consumers);

    if (channel.consumers.size === 0 && channel.participants.size === 0) {
      this.ChannelStore.delete(channelId);
    }
  }

  private handleTrackEvent(e: RTCTrackEvent, producerId: string) {
    const streams = e.streams;

    const combinedStream = new wrtc.MediaStream() as MediaStream;
    const kinds = [];

    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        if (!track) {
          this.logger.warn('Encountered an undefined track, skipping.');
          return;
        }
        combinedStream.addTrack(track);
        kinds.push(track.kind);
      });
    });

    const producer: Omit<Producer, 'senderId' | 'userId' | 'peer' | 'type'> = {
      id: producerId,
      streams,
      kind: kinds.join('/'),
      enabled: true,
      trackId: combinedStream.id,
    };

    return producer;
  }
}
