"use client";

import { GetServerChannels } from "@/API";
import { notFound, redirect, useParams } from "next/navigation";
import {
    channelType,
    IResGetChannelServer,
    MemberRole,
} from "@/interfaces/server.interface";
import ServerHeader from "./server-header";
import { useAuth } from "@clerk/nextjs";
import { memo, useEffect, useRef, useState } from "react";
import { ScrollArea } from "../ui/scroll-area";
import ServerSearch from "./server-search";
import { Hash, Mic, ShieldAlert, ShieldCheck, Video } from "lucide-react";
import { Separator } from "../ui/separator";
import ServerSection from "./server-section";
import ServerChannel from "./server-channel";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import ServerMember from "./server-member";
import ChatBoxSidebarSkeleton from "../loadding/sidebar-ChatBox-skeleton";
import { useData } from "../providers/data-provider";

interface IServerSideBar {
    serverId: string;
}

const iconMap = {
    [channelType.TEXT]: <Hash className="mr-2 w-4 h-4" />,
    [channelType.AUDIO]: <Mic className="mr-2 w-4 h-4" />,
    [channelType.VIDEO]: <Video className="mr-2 w-4 h-4" />,
};

const roleIconMap = {
    [MemberRole.GUEST]: null,
    [MemberRole.MODERATOR]: (
        <ShieldCheck className="w-4 h-4 text-indigo-500 mr-2" />
    ),
    [MemberRole.ADMIN]: <ShieldAlert className="w-4 h-4 text-rose-500 mr-2" />,
};

const ServerSideBar = ({ serverId }: IServerSideBar) => {
    const { userId } = useAuth();

    const { servers } = useData();

    const serverData = servers.find((server) => server.id === serverId);

    if (!serverData) {
        return notFound();
    }

    const textChannels = serverData.channels.filter(
        (channel) => channel.type === channelType.TEXT
    );
    const audioChannels = serverData.channels.filter(
        (channel) => channel.type === channelType.AUDIO
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

    if (!currentUser) return;

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
            <ScrollArea className="flex-1 px-3">
                <div className="mt-2">
                    <ServerSearch
                        data={[
                            {
                                label: "Text channel",
                                type: "Channel",
                                values: textChannels?.map((channel) => {
                                    return {
                                        id: channel.id,
                                        name: channel.name,
                                        icon: iconMap[
                                            channel.type as channelType
                                        ],
                                    };
                                }),
                            },
                            {
                                label: "Voice channel",
                                type: "Channel",
                                values: audioChannels?.map((channel) => {
                                    return {
                                        id: channel.id,
                                        name: channel.name,
                                        icon: iconMap[
                                            channel.type as channelType
                                        ],
                                    };
                                }),
                            },
                            {
                                label: "Video channel",
                                type: "Channel",
                                values: videoChannels?.map((channel) => {
                                    return {
                                        id: channel.id,
                                        name: channel.name,
                                        icon: iconMap[
                                            channel.type as channelType
                                        ],
                                    };
                                }),
                            },
                            {
                                label: "Members",
                                type: "Member",
                                values: members?.map((member) => {
                                    return {
                                        id: member.id,
                                        name: member.profile.name,
                                        icon: roleIconMap[member.role],
                                    };
                                }),
                            },
                        ]}
                    />
                </div>

                <Separator className="bg-zinc-400 dark:bg-neutral-200 rounded-md my-2" />

                {!!textChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="Channel"
                            channelType={channelType.TEXT}
                            role={currentUser?.role}
                            label="Text Chat Channel"
                            server={serverData}
                        />
                        {textChannels.map((channel) => {
                            return (
                                <ServerChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={currentUser?.role}
                                    server={serverData}
                                />
                            );
                        })}
                    </div>
                )}

                {!!audioChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="Channel"
                            channelType={channelType.AUDIO}
                            role={currentUser?.role}
                            label="Voice Chat Channel"
                            server={serverData}
                        />
                        {audioChannels.map((channel) => {
                            return (
                                <ServerChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={currentUser?.role}
                                    server={serverData}
                                />
                            );
                        })}
                    </div>
                )}

                {!!videoChannels?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="Channel"
                            channelType={channelType.VIDEO}
                            role={currentUser?.role}
                            label="Video Chat Channel"
                            server={serverData}
                        />
                        {videoChannels.map((channel) => {
                            return (
                                <ServerChannel
                                    key={channel.id}
                                    channel={channel}
                                    role={currentUser?.role}
                                    server={serverData}
                                />
                            );
                        })}
                    </div>
                )}

                {!!members?.length && (
                    <div className="mb-2">
                        <ServerSection
                            sectionType="Member"
                            role={currentUser?.role}
                            label="Members"
                            server={serverData}
                        />
                        {members.map((member) => {
                            return (
                                <ServerMember
                                    key={member.id}
                                    member={member as any}
                                />
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};

export default memo(ServerSideBar);
