export type Room = {
  roomId: string;
  participants: Map<string, Producer[]>;
};

export type Producer = {
  senderId: string;
  streams: readonly MediaStream[];
  kinds: string[];
  enabled: boolean;
  trackIds: string[];
};
