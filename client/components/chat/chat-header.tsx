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
}

const ChatHeader = ({ name, serverId, type, imageUrl }: IChatHeaderProps) => {
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
                <UserAvatar
                    src={imageUrl || ""}
                    className="w-8 h-8 md:h-8 md:w-8"
                />
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
