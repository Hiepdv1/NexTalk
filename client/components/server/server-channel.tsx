"use client";

import {
    channelType,
    IChannel,
    IResChannels,
    IResGetChannelServer,
    MemberRole,
} from "@/interfaces";
import { cn } from "@/lib/utils";
import { Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { ActionTooltip } from "../action.tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { MouseEvent } from "react";
import Link from "next/link";
import { useData } from "../providers/data-provider";

interface IServerChannelProps {
    channel: IChannel;
    role?: MemberRole;
    server: IResGetChannelServer;
}

const iconMap = {
    [channelType.TEXT]: Hash,
    [channelType.AUDIO]: Mic,
    [channelType.VIDEO]: Video,
};

const ServerChannel = ({ channel, server, role }: IServerChannelProps) => {
    const { isInteracted } = useData();
    const { onOpen } = useModal();
    const params = useParams();
    const router = useRouter();

    const Icon = iconMap[channel.type as channelType];

    const onEdit = (e: MouseEvent) => {
        e.stopPropagation();
        onOpen("EditChannel", {
            channel,
            serverId: server.id,
        });
    };

    const onDelete = (e: MouseEvent) => {
        onOpen("DeleteChannel", { channel });
    };

    const handleNavigate = () => {
        if (!isInteracted.current) isInteracted.current = true;

        router.prefetch(`/servers/${params?.serverId}/channels/${channel.id}`);
        router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
    };

    return (
        <button
            onClick={handleNavigate}
            className={cn(
                "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
                params?.channelId === channel.id &&
                    "bg-zinc-700/20 dark:bg-zinc-700"
            )}
        >
            <Icon className="flex-shrink-0 w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <p
                className={cn(
                    "line-clamp-1 font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                    params?.channelId === channel.id &&
                        "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                )}
            >
                {channel.name}
            </p>

            {channel.name === "general" && (
                <Lock className="ml-auto w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            )}

            {channel.name !== "general" && role !== MemberRole.GUEST && (
                <div className="ml-auto flex items-center gap-x-2">
                    <ActionTooltip label="Edit">
                        <Edit
                            onClick={onEdit}
                            className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                        />
                    </ActionTooltip>
                    <ActionTooltip label="Delete">
                        <Trash
                            onClick={onDelete}
                            className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                        />
                    </ActionTooltip>
                </div>
            )}
        </button>
    );
};

export default ServerChannel;
