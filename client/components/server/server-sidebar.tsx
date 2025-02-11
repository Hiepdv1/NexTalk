"use client";

import { notFound } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { memo, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import {
    Hash,
    Mic,
    ShieldAlert,
    ShieldCheck,
    Video,
    Users,
} from "lucide-react";
import { Separator } from "../ui/separator";
import ServerHeader from "./server-header";
import ServerSearch from "./server-search";
import ServerSection from "./server-section";
import ServerChannel from "./server-channel";
import ServerMember from "./server-member";
import { channelType, MemberRole } from "@/interfaces/server.interface";
import { useData } from "../providers/data-provider";

const iconMap = {
    [channelType.TEXT]: <Hash className="mr-2 w-4 h-4" />,
    [channelType.VIDEO]: <Video className="mr-2 w-4 h-4" />,
};

const roleIconMap = {
    [MemberRole.GUEST]: null,
    [MemberRole.MODERATOR]: (
        <ShieldCheck className="w-4 h-4 text-indigo-500 mr-2" />
    ),
    [MemberRole.ADMIN]: <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />,
};

const ServerSideBar = ({ serverId }: { serverId: string }) => {
    const { userId } = useAuth();
    const { servers } = useData();
    const {
        unreadMessageCountMap,
        unreadDirectMessageCountMap,
        conversations,
    } = useData();
    const [voiceStatus, setVoiceStatus] = useState("Voice Connected");
    const [isVoiceMuted, setIsVoiceMuted] = useState(false);

    const serverData = servers.find((server) => server.id === serverId);
    if (!serverData) return notFound();

    const textChannels = serverData.channels.filter(
        (channel) => channel.type === channelType.TEXT
    );
    const videoChannels = serverData.channels.filter(
        (channel) => channel.type === channelType.VIDEO
    );
    const members = serverData.members.filter(
        (member) => member.profile.userId !== userId
    );
    const currentUser = serverData.members.find(
        (member) => member.profile.userId === userId
    );

    if (!currentUser) return null;

    return (
        <div className="flex flex-col w-full h-full text-primary dark:bg-[#2B2D31] bg-[#F2F3F5]">
            <ServerHeader
                role={currentUser?.role}
                serverId={serverData.id}
                inviteCode={serverData.inviteCode}
                serverName={serverData.name}
                imageUrl={serverData.imageUrl}
                members={serverData.members}
                profileId={serverData.profileId}
            />

            <div className="px-3 pt-2">
                <ServerSearch
                    data={[
                        {
                            label: "Text Channels",
                            type: "Channel",
                            values: textChannels?.map((channel) => ({
                                id: channel.id,
                                name: channel.name,
                                icon: iconMap[channel.type as channelType],
                            })),
                        },
                        {
                            label: "Voice Channels",
                            type: "Channel",
                            values: videoChannels?.map((channel) => ({
                                id: channel.id,
                                name: channel.name,
                                icon: iconMap[channel.type as channelType],
                            })),
                        },
                        {
                            label: "Members",
                            type: "Member",
                            values: members?.map((member) => ({
                                id: member.id,
                                name: member.profile.name,
                                icon: roleIconMap[member.role],
                            })),
                        },
                    ]}
                />
            </div>

            <Separator className="bg-zinc-400 dark:bg-neutral-200 rounded-md mx-3 my-2" />

            <ScrollArea className="flex-1 px-3">
                <div className="space-y-4">
                    {!!textChannels?.length && (
                        <div>
                            <ServerSection
                                sectionType="Channel"
                                channelType={channelType.TEXT}
                                role={currentUser?.role}
                                label="Text Channels"
                                server={serverData}
                            />
                            <div className="mt-1 space-y-0.5">
                                {textChannels.map((channel) => {
                                    const serverUnread =
                                        unreadMessageCountMap.get(
                                            channel.serverId
                                        );

                                    const totalUnread =
                                        serverUnread?.get(channel.id) || 0;
                                    return (
                                        <ServerChannel
                                            key={channel.id}
                                            channel={channel}
                                            role={currentUser?.role}
                                            server={serverData}
                                            totalUnread={totalUnread}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!!videoChannels?.length && (
                        <div>
                            <ServerSection
                                sectionType="Channel"
                                channelType={channelType.VIDEO}
                                role={currentUser?.role}
                                label="Voice Channels"
                                server={serverData}
                            />
                            <div className="mt-1 space-y-0.5">
                                {videoChannels.map((channel) => {
                                    const serverUnread =
                                        unreadMessageCountMap.get(
                                            channel.serverId
                                        );

                                    const totalUnread =
                                        serverUnread?.get(channel.id) || 0;

                                    return (
                                        <ServerChannel
                                            key={channel.id}
                                            channel={channel}
                                            role={currentUser?.role}
                                            server={serverData}
                                            totalUnread={totalUnread}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!!members?.length && (
                        <div>
                            <ServerSection
                                sectionType="Member"
                                role={currentUser?.role}
                                label={`Members — ${members.length}`}
                                server={serverData}
                            />
                            <div className="mt-1 space-y-0.5">
                                {members.map((member) => {
                                    const serverUnread =
                                        unreadDirectMessageCountMap.get(
                                            member.serverId
                                        );

                                    console.log(
                                        "Server Unread Direct Message Count: ",
                                        serverUnread
                                    );

                                    const conversation = conversations.find(
                                        (conversation) => {
                                            return (
                                                (conversation.memberOneId ===
                                                    member.id ||
                                                    conversation.memberTwoId ===
                                                        member.id) &&
                                                (conversation.memberOneId ===
                                                    currentUser.id ||
                                                    conversation.memberTwoId ===
                                                        currentUser.id)
                                            );
                                        }
                                    );

                                    const totalUnread = conversation?.id
                                        ? serverUnread?.get(conversation.id)
                                        : 0 || 0;

                                    return (
                                        <ServerMember
                                            key={member.id}
                                            isOnline={member.isOnline}
                                            member={member as any}
                                            totalUnread={totalUnread}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default ServerSideBar;
