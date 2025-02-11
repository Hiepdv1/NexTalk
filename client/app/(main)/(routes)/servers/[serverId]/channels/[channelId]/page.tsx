"use client";

import ChatHeader from "@/components/chat/chat-header";
import ChatInput from "@/components/chat/chat-input";
import ChatMessage from "@/components/chat/chat-message";
import { useData } from "@/components/providers/data-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { useSocket } from "@/components/providers/socket-provider";
import VideoCall from "@/components/videoCall/video-call";
import { channelType, IChannel } from "@/interfaces";
import { useRouter } from "next/navigation";
import { Fragment, useEffect } from "react";

interface IChannelIdPageProps {
    params: {
        serverId: string;
        channelId: string;
    };
}

const ChannelIdPage = ({ params }: IChannelIdPageProps) => {
    const { servers, profile, conversations, isInteracted, activeChannel } =
        useData();
    const { sendMessage } = useSocket();
    const { addListener } = useSocketEvents();
    const router = useRouter();

    const server = servers.find((server) => server.id === params.serverId);

    const channel = server?.channels.find(
        (channel) => channel.id === params.channelId
    );

    const member = server?.members.find(
        (member) => member.profileId === profile?.id
    );

    if (!server || !channel || !profile || !member || !sendMessage) {
        return null;
    }

    useEffect(() => {
        if (channel.type === channelType.VIDEO && !isInteracted.current) {
            router.prefetch(
                `/servers/${servers[0].id}/channels/${servers[0].channels[0].id}`
            );
            router.push(
                `/servers/${servers[0].id}/channels/${servers[0].channels[0].id}`
            );
        }
    }, []);

    useEffect(() => {
        activeChannel.current = channel.id;

        sendMessage(
            "channel-read",
            { channelId: params.channelId, serverId: params.serverId },
            "POST"
        );

        return () => {
            activeChannel.current = null;
        };
    }, [sendMessage, params.channelId, params.serverId]);

    if (channel.type === channelType.VIDEO && !isInteracted.current) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-[#313338] flex flex-col h-screen">
            <ChatHeader
                serverId={channel.serverId}
                name={channel.name}
                type="channel"
            />
            {channel.type === channelType.TEXT && (
                <Fragment>
                    <ChatMessage
                        member={member}
                        type="Channel"
                        apiUrl="fetch:messages"
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
                </Fragment>
            )}

            {channel.type === channelType.VIDEO && (
                <VideoCall
                    servers={servers}
                    roomId={params.channelId}
                    currentProfile={profile}
                />
            )}
        </div>
    );
};

export default ChannelIdPage;
