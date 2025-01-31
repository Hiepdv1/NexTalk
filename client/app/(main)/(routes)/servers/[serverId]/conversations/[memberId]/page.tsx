"use client";

import { useEffect } from "react";
import { notFound } from "next/navigation";
import ChatHeader from "@/components/chat/chat-header";
import { useData } from "@/components/providers/data-provider";
import ChatMessage from "@/components/chat/chat-message";
import ChatInput from "@/components/chat/chat-input";
import { useSocket } from "@/components/providers/socket-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import { IConversation } from "@/interfaces";

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
        (member) =>
            member.profileId === profile?.id && member.id !== params.memberId
    );

    if (!currentMember) return notFound();

    const otherMember = server.members.find((m) => m.id === params.memberId);

    if (!otherMember) return;

    const conversation = conversations.find((con) => {
        return (
            (con.memberOneId === otherMember.id ||
                con.memberTwoId === otherMember.id) &&
            con.memberOne.serverId === params.serverId &&
            con.memberTwo.serverId === params.serverId
        );
    });

    const handleGetConversation = (data: any) => {
        const conversation = JSON.parse(decrypt(data)) as IConversation;
        handleAddConversation(conversation);
    };

    const handleFetchConversation = () => {
        if (!sendMessage) return;
        const message = {
            memberOneId: currentMember.id,
            memberTwoId: params.memberId,
            serverId: params.serverId,
        };

        if (!conversation) {
            console.log("Fetch conversation");
            sendMessage("fetch:conversation", message, "GET", {});
        }
    };

    useEffect(() => {
        if (!sendMessage) return;

        const memberIds = [currentMember.id, params.memberId];

        memberIds.sort();

        addListener(
            `conversation:${memberIds.join("-")}`,
            handleGetConversation
        );

        handleFetchConversation();

        return () => {
            removeListener(
                `conversation:${memberIds.join("-")}`,
                handleGetConversation
            );
        };
    }, [conversation]);

    if (!conversation) return;

    return (
        <div className="bg-white dark:bg-[#313338] flex flex-col h-screen">
            <ChatHeader
                name={otherMember.profile.name}
                imageUrl={otherMember.profile.imageUrl}
                serverId={params.serverId}
                type="conversation"
                isOnline={otherMember.isOnline}
            />
            <ChatMessage
                member={otherMember}
                name={otherMember.profile.name}
                chatId={conversation.id}
                apiUrl="fetch:conversation:message"
                paramKey="conversationId"
                socketQuery={{
                    conversationId: conversation.id,
                    serverId: server.id,
                }}
                type="Conversation"
                paramValue=""
                conversation={conversation}
            />
            <ChatInput
                member={otherMember}
                apiUrl="/conversations/messages/uploadFile"
                name={otherMember.profile.name}
                query={{
                    serverId: server.id,
                    memberId: currentMember.id,
                    conversationId: conversation.id,
                    otherMemberId: otherMember.id,
                }}
                type="conversation"
                conversation={conversation}
            />
        </div>
    );
};

export default MemberIdPage;
