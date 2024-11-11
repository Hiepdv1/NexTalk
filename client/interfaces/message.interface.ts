import { MemberRole } from "./server.interface";

export interface Profile {
    id: string;
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
}

export interface Member {
    id: string;
    role: MemberRole;
    profileId: string;
    profile: Profile;
}

export enum MessageType {
    TEXT,
    VIDEO,
    FILE,
    IMAGE,
}

export interface Message {
    id: string;
    content: string;
    fileId?: string;
    fileUrl?: string;
    posterUrl?: string;
    posterId?: string;
    type?: string;
    memberId: string;
    channelId: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    member: Member;
}
