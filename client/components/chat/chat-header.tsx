"use client";

import { Hash, Menu } from "lucide-react";
import MobileToggle from "../mobile-toggle";
import UserAvatar from "../ui/user-avatar";
import { SocketInditor } from "../ui/socket-indicator";
import { memo } from "react";

interface IChatHeaderProps {
    serverId: string;
    name: string;
    type: "channel" | "conversation";
    imageUrl?: string;
    isOnline?: boolean;
}

const ChatHeader = ({
    name,
    serverId,
    type,
    imageUrl,
    isOnline,
}: IChatHeaderProps) => {
    return (
        <div
            className="font-semibold px-3 flex items-center h-12 
        border-neutral-200 dark:border-neutral-800 border-b-2"
        >
            <MobileToggle serverId={serverId} />
            {type === "channel" && (
                <Hash className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            )}
            {type === "conversation" && (
                <div className="relative">
                    <UserAvatar
                        src={imageUrl || ""}
                        className="w-8 h-8 md:h-8 md:w-8"
                    />
                    {isOnline && (
                        <div className="absolute right-0 bottom-0 w-3 h-3 z-50">
                            <div className="absolute w-full h-full bg-emerald-500 rounded-full opacity-70 animate-pulse ring-2 ring-white dark:ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" />
                            <div className="absolute w-full h-full bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
                        </div>
                    )}
                </div>
            )}
            <p className="ml-2 font-semibold text-black dark:text-white">
                {name}
            </p>
            <div className="ml-auto flex items-center">
                <SocketInditor />
            </div>
        </div>
    );
};

export default memo(ChatHeader);
