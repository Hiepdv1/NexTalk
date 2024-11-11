"use client";

import { useEffect, useState } from "react";
import { RequestGetConversation } from "@/API/conversation.api";
import {
    Conversation,
    GetOrCreateConversationResponse,
} from "@/interfaces/conversation.interface";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ChatHeader from "@/components/chat/chat-header";
import { useData } from "@/components/providers/data-provider";
import ChatMessage from "@/components/chat/chat-message";
import ChatInput from "@/components/chat/chat-input";
import { useSocket } from "@/components/providers/socket-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import { IConversation } from "@/interfaces";
import ChatInputConversation from "@/components/chat/chat-input-conversation";

interface IMemberIdPageProps {
    params: {
        serverId: string;
        memberId: string;
    };
}

const MemberIdPage = ({ params }: IMemberIdPageProps) => {
    const { profile, servers, handleAddConversation, conversations } =
        useData();
    const { addListener, removeListener } = useSocketEvents();
    const { sendMessage } = useSocket();

    const server = servers.find((server) => server.id === params.serverId);
    if (!server) return;

    const currentMember = server.members.find(
        (member) => member.profileId === profile?.id
    );

    if (!currentMember) return;

    const conversation = conversations.find((con) => {
        return (
            con.memberOne.id === params.memberId ||
            con.memberTwo.id === params.memberId
        );
    });

    useEffect(() => {
        if (!sendMessage) return;

        const handleGetConversation = (data: any) => {
            const conversation = JSON.parse(decrypt(data)) as IConversation;

            handleAddConversation(conversation);
        };

        const message = {
            memberOneId: currentMember.id,
            memberTwoId: params.memberId,
            serverId: params.serverId,
        };

        if (!conversation) {
            console.log("Fetch conversation");
            sendMessage("fetch:conversation", message, "GET", {});
        }

        const memberIds = [message.memberOneId, message.memberTwoId];

        memberIds.sort();

        addListener("conversation:data", handleGetConversation);

        return () => {
            removeListener(
                `conversation:member:${currentMember.id}`,
                handleGetConversation
            );
        };
    }, []);

    if (!conversation) return;

    const { memberOne, memberTwo } = conversation;

    const otherMember =
        memberOne.id === params.memberId ? memberOne : memberTwo;

    return (
        <div className="bg-white dark:bg-[#313338] flex flex-col h-screen">
            <ChatHeader
                name={otherMember.profile.name}
                imageUrl={otherMember.profile.imageUrl}
                serverId={params.serverId}
                type="conversation"
            />
            <ChatMessage
                member={otherMember}
                name={otherMember.profile.name}
                chatId={conversation.id}
                apiUrl="/"
                paramKey="conversationId"
                socketQuery={{}}
                type="Conversation"
                paramValue=""
            />
            <ChatInputConversation
                member={otherMember}
                apiUrl=""
                name={otherMember.profile.name}
                query={{}}
            />
        </div>
    );
};

export default MemberIdPage;
