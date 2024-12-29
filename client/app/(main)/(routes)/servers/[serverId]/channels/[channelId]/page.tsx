"use client";

import ChatHeader from "@/components/chat/chat-header";
import ChatInput from "@/components/chat/chat-input";
import ChatMessage from "@/components/chat/chat-message";
import { useData } from "@/components/providers/data-provider";
import MediaRoom from "@/components/ui/media-room";
import VideoCall from "@/components/videoCall/video-call";
import { channelType } from "@/interfaces";
import { Fragment } from "react";

interface IChannelIdPageProps {
    params: {
        serverId: string;
        channelId: string;
    };
}

const ChannelIdPage = ({ params }: IChannelIdPageProps) => {
    const { servers, profile, conversations } = useData();

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

            {channel.type === channelType.AUDIO && (
                <MediaRoom chatId={channel.id} audio={true} video={false} />
            )}

            {channel.type === channelType.VIDEO && (
                <VideoCall roomId={params.channelId} currentProfile={profile} />
            )}
        </div>
    );
};

export default ChannelIdPage;
