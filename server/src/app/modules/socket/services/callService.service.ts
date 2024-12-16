import { Injectable, NotFoundException } from '@nestjs/common';
import { Producer, Room } from '../dto/channel.dto';
import wrtc from 'wrtc';

@Injectable()
export class CallService {
  private readonly ChannelStore: Map<string, Room> = new Map();

  constructor() {}

  public async joinRoom(roomId: string, socketId: string) {
    let room = this.ChannelStore.get(roomId);
    if (!room) {
      room = {
        roomId,
        participants: new Map(),
      };

      room.participants.set(socketId, []);
    } else {
      if (!room.participants.has(socketId)) {
        room.participants.set(socketId, []);
      }
    }

    this.ChannelStore.set(roomId, room);
  }

  public getProducers(roomId: string) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room.participants;
  }

  public getChannel(roomId: string) {
    const channel = this.ChannelStore.get(roomId);

    if (!channel) throw new NotFoundException('The channel not found');

    return channel;
  }

  public async createProducer({
    roomId,
    socketId,
    sdp,
  }: {
    roomId: string;
    socketId: string;
    sdp: RTCSessionDescriptionInit;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const participants = room.participants.get(socketId);

    if (!participants) {
      throw new NotFoundException('Participants not found');
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org',
        },
      ],
    });

    let infoProducer: Producer;

    peer.ontrack = (e) => {
      const producer = this.handleTrackEvent(e);
      infoProducer = {
        ...producer,
        senderId: socketId,
      };

      const existingProducer = participants.find(
        (p) =>
          p.senderId === socketId &&
          p.trackIds.every((id) => producer.trackIds.includes(id))
      );

      if (existingProducer) {
        existingProducer.streams = producer.streams;
        existingProducer.kinds = producer.kinds;
        existingProducer.enabled = producer.enabled;
      } else {
        participants.push(infoProducer);
      }

      this.ChannelStore.set(roomId, room);
    };
    const offer = new wrtc.RTCSessionDescription(sdp);
    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    const payload = {
      sdp: peer.localDescription,
      kinds: infoProducer.kinds,
      senderId: infoProducer.senderId,
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
      throw new NotFoundException('Room not found');
    }

    const participant = room.participants.get(producerId);
    if (!participant) {
      throw new NotFoundException('Producer not found');
    }

    const consumerPeer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.stunprotocol.org' }],
    });

    const producer = participant.find(
      (p) => p.kinds.join('/') === kind || p.kinds.reverse().join('/') === kind
    );

    if (!producer) {
      throw new NotFoundException(`${kind} producer not found`);
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
      kind: producer.kinds,
      producerId,
    };
  }

  public async createConsumer({
    roomId,
    participantId,
    sdp,
    kind,
  }: {
    roomId: string;
    participantId: string;
    sdp: RTCSessionDescription;
    kind: string;
  }) {
    const room = this.ChannelStore.get(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const participants = room.participants.get(participantId);
    if (!participants) {
      throw new NotFoundException('Participants not found');
    }

    const peer: RTCPeerConnection = new wrtc.RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.stunprotocol.org' }],
    });

    const producer = participants.find(
      (p) => p.kinds.join('/') === kind || p.kinds.reverse().join('/') === kind
    );

    if (!producer) {
      throw new NotFoundException(`${kind} producer not found`);
    }

    producer.streams.forEach((stream) =>
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      })
    );

    const desc = new wrtc.RTCSessionDescription(sdp);

    await peer.setRemoteDescription(desc);

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    return {
      sdp: peer.localDescription,
      kind: producer.kinds,
      participantId,
    };
  }

  private handleTrackEvent(e: RTCTrackEvent) {
    const streams = e.streams;

    const kinds: string[] = [];
    const trackIds: string[] = [];

    for (const stream of streams) {
      for (const track of stream.getTracks()) {
        kinds.push(track.kind);
        trackIds.push(track.id);
      }
    }

    const producer: Omit<Producer, 'senderId'> = {
      streams,
      kinds,
      enabled: true,
      trackIds,
    };

    return producer;
  }

  public async leaveRoom(socketId: string) {
    const rooms = this.ChannelStore.values();

    for (const room of rooms) {
      if (room.participants.has(socketId)) {
        console.log('Participant deleted: ', room.participants.get(socketId));
        room.participants.delete(socketId);
      }
    }
  }

  public async closeChannel() {}
}
