"use client";

import { channelType, IResGetChannelServer, MemberRole } from "@/interfaces";
import { ActionTooltip } from "../action.tooltip";
import { Plus, Settings } from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";
import { memo } from "react";

interface IServerSectionProps {
    label: string;
    role?: MemberRole;
    sectionType: "Member" | "Channel";
    channelType?: channelType;
    server: IResGetChannelServer;
}

const ServerSection = ({
    label,
    role,
    sectionType,
    channelType,
    server,
}: IServerSectionProps) => {
    const { onOpen } = useModal();

    return (
        <div className="flex items-center justify-between py-2">
            <p className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            {role !== MemberRole.GUEST && sectionType === "Channel" && (
                <ActionTooltip label="Create Channel" side="top">
                    <button
                        onClick={() => onOpen("CreateChannel", { channelType })}
                        className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </ActionTooltip>
            )}

            {role === MemberRole.ADMIN && sectionType === "Member" && (
                <ActionTooltip label="Manage Members" side="top">
                    <button
                        onClick={() =>
                            onOpen("Members", {
                                serverId: server.id,
                                serverName: server.name,
                                members: server.members as any,
                            })
                        }
                        className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </ActionTooltip>
            )}
        </div>
    );
};

export default memo(ServerSection);
