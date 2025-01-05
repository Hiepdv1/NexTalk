import { Injectable } from '@nestjs/common';
import { Producer, Room } from '../dto/channel.dto';
import wrtc from 'wrtc';
import { v4 as genuid } from 'uuid';
import { WsNotFoundException } from 'src/errors/WsError';
import { TwilioService } from 'nestjs-twilio';

@Injectable()
export class CallService {
  private readonly ChannelStore: Map<string, Room> = new Map();
  private SERVER_STUNS: Array<{
    url?: string;
    urls: string;
    username?: string;
    credential?: string;
  }> = [];

  constructor(private readonly twilioService: TwilioService) {}

  public async CreateTwilioToken() {
    try {
      const token = await this.twilioService.client.tokens.create();

      const iceServers = [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun2.1.google.com:19302' },
      ];

      this.SERVER_STUNS = [...(token.iceServers as any), ...iceServers];

      this.SERVER_STUNS.forEach((server: any) => {
        if (server.url) {
          delete server.url;
        }
      });

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

  public async createProducer({
    roomId,
    socketId,
    sdp,
    userId,
    type,
  }: {
    roomId: string;
    socketId: string;
    sdp: RTCSessionDescriptionInit;
    userId: string;
    type: string;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    const participants = room.participants.get(socketId);

    if (!participants) {
      throw new WsNotFoundException('Participants not found');
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: this.SERVER_STUNS,
    });

    let newInfoProducer: Producer;

    const producerId = genuid();

    peer.ontrack = (e) => {
      const producer = this.handleTrackEvent(e, producerId);

      if (!producer.streams || producer.streams.length === 0) {
        console.error('No stream in producer:', producer);
        return;
      }

      newInfoProducer = {
        ...producer,
        senderId: socketId,
        userId,
        peer,
        type,
      };

      const existingProducer = participants.producers.find(
        (p) => p.senderId === socketId && p.id === newInfoProducer.id
      );

      if (existingProducer) {
        const combinedMediaStream = new wrtc.MediaStream() as MediaStream;

        producer.streams.forEach((stream) => {
          stream.getTracks().forEach((track) => {
            combinedMediaStream.addTrack(track);
          });
        });

        existingProducer.streams.forEach((stream) => {
          stream.getTracks().forEach((track) => {
            combinedMediaStream.addTrack(track);
          });
        });

        existingProducer.streams = [combinedMediaStream];
        existingProducer.kind = producer.kind;
        existingProducer.enabled = producer.enabled;
      } else {
        participants.producers.push(newInfoProducer);
      }

      this.ChannelStore.set(roomId, room);
    };

    const offer = new wrtc.RTCSessionDescription(sdp);
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    const payload = {
      sdp: peer.localDescription,
      kind: newInfoProducer.kind,
      senderId: newInfoProducer.senderId,
      peer,
      userId,
      id: newInfoProducer.id,
    };

    return payload;
  }

  public async createConsumerOffer({
    chanellId,
    producerId,
    kind,
  }: {
    chanellId: string;
    producerId: string;
    kind: string;
  }) {
    const room = this.ChannelStore.get(chanellId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    const participant = room.participants.get(producerId);
    if (!participant) {
      throw new WsNotFoundException('Producer not found');
    }

    const consumerPeer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: this.SERVER_STUNS,
    });

    const producer = participant.producers.find((p) => p.kind === kind);

    if (!producer) {
      throw new WsNotFoundException(`${kind} producer not found`);
    }

    producer.streams.forEach((stream) =>
      stream.getTracks().forEach((track) => {
        consumerPeer.addTrack(track, stream);
      })
    );

    const offer = await consumerPeer.createOffer();
    await consumerPeer.setLocalDescription(offer);

    return {
      sdp: consumerPeer.localDescription,
      kind: producer.kind,
      producerId,
    };
  }

  public async createConsumer({
    socketId,
    roomId,
    participantId,
    sdp,
    kind,
    producerId,
  }: {
    socketId: string;
    roomId: string;
    participantId: string;
    sdp: RTCSessionDescriptionInit;
    kind: string;
    producerId: string;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new WsNotFoundException('Room not found');
    }

    const participants = room.participants.get(participantId);
    if (!participants) {
      throw new WsNotFoundException('Participants not found');
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: this.SERVER_STUNS,
    });

    console.log('Kind: ', kind);

    const producer = participants.producers.find((p) => p.id === producerId);

    if (!producer) {
      throw new WsNotFoundException(`${kind} producer not found`);
    }

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

    const existingConsumer = room.consumers.get(socketId);

    const consumerId = genuid();

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

    console.log('New Consumer: ', newConsumer);
    console.log('SocketId New Consumer: ', socketId);

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
