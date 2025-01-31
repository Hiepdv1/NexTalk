"use client";

import { IProfile, IResMembers, MemberRole } from "@/interfaces";
import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import UserAvatar from "../ui/user-avatar";
import { memo } from "react";

interface IServerMemberProps {
    member: IResMembers & { profile: IProfile };
    isOnline: boolean;
}

const roleIconMap = {
    [MemberRole.GUEST]: null,
    [MemberRole.MODERATOR]: (
        <ShieldCheck className="w-4 h-4 ml-2 text-indigo-500" />
    ),
    [MemberRole.ADMIN]: <ShieldAlert className="w-4 h-4 ml-2 text-rose-500" />,
};

const ServerMember = ({ member, isOnline }: IServerMemberProps) => {
    const router = useRouter();
    const params = useParams();

    const icon = roleIconMap[member.role];

    const handleNavigateMembers = () => {
        router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
    };

    console.log("Members: ", member);

    return (
        <div>
            <button
                onClick={handleNavigateMembers}
                className={cn(
                    "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
                    params?.memberId === member.id &&
                        "bg-zinc-700/20 dark:bg-zinc-700"
                )}
            >
                <div className="relative">
                    <UserAvatar
                        className="w-8 h-8 md:h-8 md:w-8"
                        src={member.profile.imageUrl}
                    />

                    {isOnline && (
                        <div className="absolute right-0 bottom-0 w-3 h-3 z-50">
                            <div className="absolute w-full h-full bg-emerald-500 rounded-full opacity-70 animate-pulse ring-2 ring-white dark:ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" />
                            <div className="absolute w-full h-full bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
                        </div>
                    )}
                </div>
                <p
                    className={cn(
                        "font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                        params?.channelId === member.id &&
                            "text-primary dark:text-zinc-200 dark:group-hover:text-white"
                    )}
                >
                    {member.profile.name}
                </p>
                {icon}
            </button>
        </div>
    );
};

export default memo(ServerMember);
