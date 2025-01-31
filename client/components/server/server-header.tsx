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
                <button className="w-full text-sm font-semibold px-3 flex items-center h-12 border-b-[1px] dark:border-neutral-200 border-zinc-400 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition-all duration-200">
                    {serverName}
                    <ChevronDown className="w-5 h-5 ml-auto opacity-80" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 text-xs font-medium text-black dark:text-neutral-400 space-y-[2px]">
                {isModerator && (
                    <>
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("Invite", { inviteCode, serverId })
                            }
                            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite People
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onOpen("CreateChannel")}
                            className="px-3 py-2 text-sm cursor-pointer"
                        >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Create Channel
                        </DropdownMenuItem>
                    </>
                )}

                {isAdmin && (
                    <>
                        <DropdownMenuSeparator className="my-1" />
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
                            <Settings className="w-4 h-4 mr-2" />
                            Server Settings
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
                            <User className="w-4 h-4 mr-2" />
                            Manage Members
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                            onClick={() =>
                                onOpen("DeleteServer", { serverName, serverId })
                            }
                            className="text-rose-600 px-3 py-2 text-sm cursor-pointer"
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete Server
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
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Server
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default memo(ServerHeader);
