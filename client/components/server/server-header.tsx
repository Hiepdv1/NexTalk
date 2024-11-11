"use client";

import { IMember, MemberRole } from "@/interfaces/server.interface";
import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenu,
    DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
    ChevronDown,
    LogOut,
    PlusCircle,
    Settings,
    Trash,
    User,
    UserPlus,
} from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";
import { memo } from "react";

interface IServerHeaderProps {
    inviteCode: string;
    serverName: string;
    serverId: string;
    imageUrl: string;
    role?: string;
    members: IMember[];
    profileId: string;
}

const ServerHeader = ({
    role,
    inviteCode,
    serverName,
    serverId,
    imageUrl,
    members,
    profileId,
}: IServerHeaderProps) => {
    const { onOpen } = useModal();
    const isAdmin = role === MemberRole.ADMIN;
    const isModerator = isAdmin || role === MemberRole.MODERATOR;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none" asChild>
                <button
                    className="
                    w-full text-sm font-semibold px-3 flex items-center h-12 border-b-[1px]
                    dark:border-neutral-200 border-zinc-400 hover:bg-zinc-700/10
                    dark:hover:bg-zinc-700/50 transition"
                >
                    {serverName}
                    <ChevronDown className="w-5 h-5 ml-auto" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 text-xs font-medium text-black dark:text-neutral-400 space-y-1">
                {isModerator && (
                    <>
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("Invite", { inviteCode, serverId })
                            }
                            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
                        >
                            Invite People
                            <UserPlus className="w-43 h-4 ml-auto" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onOpen("CreateChannel")}
                            className="px-3 py-2 text-sm cursor-pointer"
                        >
                            Create Channel
                            <PlusCircle className="w-43 h-4 ml-auto" />
                        </DropdownMenuItem>
                    </>
                )}

                {isAdmin && (
                    <>
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("EditServer", {
                                    serverId,
                                    imageUrl,
                                    serverName,
                                })
                            }
                            className="px-3 py-2 text-sm cursor-pointer"
                        >
                            Server Settings
                            <Settings className="w-43 h-4 ml-auto" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("Members", {
                                    serverId,
                                    members,
                                    profileId,
                                })
                            }
                            className="px-3 py-2 text-sm cursor-pointer"
                        >
                            Manager Members
                            <User className="w-43 h-4 ml-auto" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("DeleteServer", { serverName, serverId })
                            }
                            className="text-rose-600 px-3 py-2 text-sm cursor-pointer"
                        >
                            Delete Server
                            <Trash className="w-43 h-4 ml-auto" />
                        </DropdownMenuItem>
                    </>
                )}

                {!isAdmin && (
                    <DropdownMenuItem
                        onClick={() =>
                            onOpen("LeaveServer", { serverName, serverId })
                        }
                        className="text-rose-600 px-3 py-2 text-sm cursor-pointer"
                    >
                        Leave Server
                        <LogOut className="w-43 h-4 ml-auto" />
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default memo(ServerHeader);
