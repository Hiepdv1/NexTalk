"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ActionTooltip } from "../action.tooltip";
import { memo } from "react";
import Link from "next/link";

interface INavigationItemProps {
    id: string;
    imageUrl: string;
    name: string;
    totalUnread?: number;
}

const NavigationItem = ({
    id,
    imageUrl,
    name,
    totalUnread,
}: INavigationItemProps) => {
    const params = useParams();
    const router = useRouter();

    return (
        <ActionTooltip side="right" align="center" label={name}>
            <Link
                href={`/servers/${id}`}
                className="group relative flex items-center"
                prefetch={true}
            >
                <div
                    className={cn(
                        "absolute left-0 bg-primary rounded-r-full transition-all w-1",
                        params?.serverId !== id && "group-hover:h-5",
                        params?.serverId === id ? "h-9" : "h-2"
                    )}
                />
                <div
                    className={cn(
                        "relative group flex mx-3 w-12 h-12  group-hover:rounded-2xl transition-all",
                        params?.serverId === id &&
                            "bg-primary/10 text-primary rounded-2xl"
                    )}
                >
                    <Image
                        className="object-cover rounded-2xl"
                        fill
                        alt="channel"
                        src={imageUrl}
                    />
                    {totalUnread && totalUnread > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center p-1">
                            {totalUnread > 99 ? "99+" : totalUnread}
                        </div>
                    )}
                </div>
            </Link>
        </ActionTooltip>
    );
};

export default memo(NavigationItem);
