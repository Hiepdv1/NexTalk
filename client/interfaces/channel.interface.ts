import { channelType, IMember, MemberRole } from "./server.interface";

export interface ICreateChannel {
    name: string;
    type: string;
}

export interface Channel {
    id: string;
    name: string;
    type: channelType;
    profileId: string;
    serverId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Member {
    id: string;
    role: MemberRole;
    profileId: string;
    serverId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GetChannelAndMyselfResponse {
    channel: Channel;
    myself: Member;
}

export interface CreateMessageResponse {
    id: string;
    content: string;
    fileUrl: string | null;
    memberId: string;
    channelId: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
    member: IMember;
}
