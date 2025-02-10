import { ICreateUserData, IResponseCreateUserData } from "./user.interface";

export interface IResChannels {
    id: string;
    name: string;
    type: channelType;
    profileId: string;
    serverId: string;
}

export enum channelType {
    "TEXT" = "TEXT",
    "VIDEO" = "VIDEO",
}

export enum MemberRole {
    "ADMIN" = "ADMIN",
    "MODERATOR" = "MODERATOR",
    "GUEST" = "GUEST",
}

export interface IResMembers {
    id: string;
    role: MemberRole;
    profileId: string;
    serverId: string;
    profile: ICreateUserData;
    isOnline: boolean;
}

export interface IProfile {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
}

export interface IResGetChannelServer {
    id: string;
    name: string;
    imageUrl: string;
    cloudId: string;
    inviteCode: string;
    profileId: string;
    channels: IChannel[];
    members: (IResMembers & { profile: IResponseCreateUserData })[];
}

export interface IResServerDetails {
    id: string;
    name: string;
    imageUrl: string;
    cloudId: string;
    inviteCode: string;
    profileId: string;
    createdAt: Date;
    updatedAt: Date;

    channels: {
        id: string;
        name: string;
        type: channelType;
        profileId: string;
        serverId: string;
        createdAt: Date;
        updatedAt: Date;
    }[];
}

export interface IProfile {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
    servers: IServer[];
    members: IMember[];
    channels: IChannel[];
    createdAt: Date;
    updatedAt: Date;
}

export interface IServer {
    id: string;
    name: string;
    imageUrl: string;
    cloudId: string;
    inviteCode: string;
    profileId: string;
    members: IMember[];
    channels: IChannel[];
    createdAt: Date;
    updatedAt: Date;
}

export interface INotification {
    id: string;
    profileId: string;
    channel_id: string;
    channel: IChannel;
    last_read_at: Date;
}

export interface IMember {
    id: string;
    role: MemberRole;
    profileId: string;
    serverId: string;
    messages: IMessage[];
    profile: IProfile;
    directMessages: IDirectMessage[];
    conversationsInitiated: IConversation[];
    conversationsReceived: IConversation[];
    isOnline: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserChannelRead {
    id: string;
    profileId: string;
    channel_id: string;
    last_read_at: Date;
}

export interface IChannel {
    id: string;
    name: string;
    type: channelType;
    profileId: string;
    serverId: string;
    server: IServer;
    members: IMember[];
    messages: IMessage[];
    userChannelRead: IUserChannelRead[];
    createdAt: Date;
    updatedAt: Date;
}

export enum MessageType {
    FILE = "FILE",
    VIDEO = "VIDEO",
    IMAGE = "IMAGE",
    TEXT = "TEXT",
}

export interface IMessage {
    id: string;
    content: string;
    fileUrl?: string;
    fileId?: string;
    posterUrl?: string;
    posterId?: string;
    type: MessageType;
    memberId: string;
    member: IMember;
    channelId: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    progress?: number;
}

export interface IDirectMessage {
    id: string;
    content: string;
    fileUrl?: string;
    fileId?: string;
    memberId: string;
    type: MessageType;
    posterUrl?: string;
    member: IMember;
    conversationId: string;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
    progress?: number;
}

export interface IConversation {
    id: string;
    memberOneId: string;
    memberTwoId: string;
    memberOne: IMember;
    memberTwo: IMember;
    directMessages: IDirectMessage[];
}
