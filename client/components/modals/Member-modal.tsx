"use client";

import qs from "query-string";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { useOrigin } from "@/hooks/use-origin";
import { useRef, useState } from "react";
import { DialogDescription } from "@radix-ui/react-dialog";
import { ScrollArea } from "../ui/scroll-area";
import UserAvatar from "../ui/user-avatar";
import {
    Shield,
    MoreVertical,
    ShieldAlert,
    ShieldCheck,
    ShieldQuestion,
    Check,
    Gavel,
    Loader2,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MemberRole } from "@/interfaces/server.interface";
import { RequestMemberKick, RequestRoleChange } from "@/API";
import { useRouter } from "next/navigation";
import { useData } from "../providers/data-provider";

const roleIconMap = {
    GUEST: null,
    MODERATOR: <ShieldCheck className="w-6 h-4 ml-2 text-indigo-500" />,
    ADMIN: <ShieldAlert className="w-6 h-4 ml-2 text-rose-500" />,
};

interface IMemberModalProps {}

const MemberModal = (props: IMemberModalProps) => {
    const router = useRouter();
    const { onOpen, isOpen, onClose, type, data } = useModal();
    const { handleUpdateServer, handleRemoveMemberInServer, servers } =
        useData();
    const [loadingId, setLoadingId] = useState("");

    const { members, profileId, serverId } = data;
    const isModalOpen = isOpen && type === "Members";

    const onMemberKick = async (memberId: string) => {
        try {
            setLoadingId(memberId);
            const url = qs.stringifyUrl({
                url: `/servers/members/${memberId}/kick`,
                query: {
                    serverId,
                    memberId,
                },
            });
            const data = await RequestMemberKick(url);

            if (data.statusCode !== 200) return;

            const server = servers.find((server) => server.id === serverId);
            if (!server) return;

            onOpen("Members", {
                members: server.members,
                profileId,
                serverId,
            });
        } catch (err) {
            console.error(err);
        }
    };

    const onRoleChange = async (memberId: string, role: MemberRole) => {
        try {
            setLoadingId(memberId);
            const url = qs.stringifyUrl({
                url: `/servers/members/${memberId}`,
                query: {
                    serverId,
                    memberId,
                },
            });

            const data = await RequestRoleChange(url, role);

            onOpen("Members", {
                members: data?.members,
                profileId: data?.profileId,
                serverId: data?.id,
            });
        } catch (error) {
            console.log(error);
        } finally {
            setLoadingId("");
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={() => onClose()}>
            <DialogContent className=" bg-white text-black border-0 p-0 overflow-hidden select-none">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Manager Members
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-500">
                        {members?.length} Members
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="mt-8 max-h-[420px] px-6">
                    {members?.map((member, index) => {
                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-x-2 mb-6"
                            >
                                <UserAvatar
                                    className=""
                                    src={member.profile.imageUrl}
                                />
                                <div className="flex flex-col gap-y-1">
                                    <div className="text-xs font-semibold flex items-center">
                                        {member.profile.name}
                                        {roleIconMap[member.role]}
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        {member.profile.email}
                                    </p>
                                </div>
                                {profileId !== member.profileId &&
                                    loadingId !== member.id && (
                                        <div className="ml-auto">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger>
                                                    <MoreVertical className="w-6 h-4 text-zinc-500 " />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent side="left">
                                                    <DropdownMenuSub>
                                                        <DropdownMenuSubTrigger className="flex items-center">
                                                            <ShieldQuestion className="w-6 h-4 mr-2" />
                                                            <span>Role</span>
                                                        </DropdownMenuSubTrigger>
                                                        <DropdownMenuPortal>
                                                            <DropdownMenuSubContent>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        onRoleChange(
                                                                            member.id,
                                                                            MemberRole.GUEST
                                                                        )
                                                                    }
                                                                >
                                                                    <Shield className="w-6 h-4 mr-2" />
                                                                    GUEST
                                                                    {member.role ===
                                                                        "GUEST" && (
                                                                        <Check className="w-6 h-4 ml-auto" />
                                                                    )}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        onRoleChange(
                                                                            member.id,
                                                                            MemberRole.MODERATOR
                                                                        )
                                                                    }
                                                                >
                                                                    <ShieldCheck className="w-6 h-4 mr-2" />
                                                                    Moderator
                                                                    {member.role ===
                                                                        "MODERATOR" && (
                                                                        <Check className="w-6 h-4 ml-auto" />
                                                                    )}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuPortal>
                                                    </DropdownMenuSub>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onMemberKick(
                                                                member.id
                                                            )
                                                        }
                                                    >
                                                        <Gavel className="w-6 h-4 mr-2" />
                                                        <span>Kick</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                {loadingId === member.id && (
                                    <Loader2 className="animate-spin text-zinc-500 ml-auto w-4 h-4" />
                                )}
                            </div>
                        );
                    })}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default MemberModal;
