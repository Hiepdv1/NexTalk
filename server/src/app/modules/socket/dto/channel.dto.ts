export type Room = {
  roomId: string;
  participants: Map<
    string,
    {
      userId: string;
      producers: Producer[];
    }
  >;
  consumers: Map<string, Consumer[]>;
};

export type Consumer = {
  userId: string;
  peer: RTCPeerConnection;
  producerId: string;
  type: string;
  id: string;
};

export type Producer = {
  id: string;
  senderId: string;
  streams: readonly MediaStream[];
  kind: string;
  enabled: boolean;
  trackId: string;
  userId: string;
  peer: RTCPeerConnection;
  type: string;
};
