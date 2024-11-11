"use client";

import ChatHeader from "@/components/chat/chat-header";
import ChatInput from "@/components/chat/chat-input";
import ChatMessage from "@/components/chat/chat-message";
import { useData } from "@/components/providers/data-provider";

interface IChannelIdPageProps {
    params: {
        serverId: string;
        channelId: string;
    };
}

const ChannelIdPage = ({ params }: IChannelIdPageProps) => {
    const { servers, profile } = useData();

    const server = servers.find((server) => server.id === params.serverId);

    const channel = server?.channels.find(
        (channel) => channel.id === params.channelId
    );

    const member = server?.members.find(
        (member) => member.profileId === profile?.id
    );

    if (!server || !channel || !profile || !member) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-[#313338] flex flex-col h-screen">
            <ChatHeader
                serverId={channel.serverId}
                name={channel.name}
                type="channel"
            />
            <ChatMessage
                member={member}
                type="Channel"
                apiUrl="get_messages"
                name={channel.name}
                socketQuery={{
                    channelId: channel.id,
                    serverId: channel.serverId,
                }}
                paramKey="channelId"
                chatId={channel.id}
                paramValue={channel.id}
                channel={channel}
            />
            <ChatInput
                apiUrl="/channels/messages/uploadFile"
                name={channel.name}
                type="channel"
                query={{
                    channelId: channel.id,
                    serverId: channel.serverId,
                    memberId: member.id,
                }}
                member={member}
                channel={channel}
            />
        </div>
    );
};

export default ChannelIdPage;
