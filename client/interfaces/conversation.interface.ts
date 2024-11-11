import { MemberRole } from "./server.interface";

export interface Profile {
    id: string;
    name: string;
    imageUrl: string;
    email: string;
    userId: string;
}

export interface Member {
    id: string;
    role: MemberRole;
    profile: Profile;
}

export interface Conversation {
    id: string;
    memberOne: Member;
    memberTwo: Member;
    directMessages: DirectMessage[];
}

export interface GetOrCreateConversationResponse {
    conversation: Conversation;
}

export interface DirectMessage {
    id: string;
    content: string;
    memberId: string;
    conversationId: string;
    createdAt: Date;
    updatedAt: Date;
}
