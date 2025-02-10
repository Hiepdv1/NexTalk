"use client";

import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import NavigationAction from "./navigation.action";
import { GetAllServers } from "@/API";
import NavigationItem from "./navigation.item";
import { ModeToggle } from "../mode-toogle";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { IResponseServerData } from "@/interfaces";
import { useRouter } from "next/navigation";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import NavigationSidebarSkeleton from "../loadding/NavigationSidebarSkeleton";
import { useData } from "../providers/data-provider";
const NavigationSideBar = () => {
    const { servers, unreadMessageCountMap } = useData();
    return (
        <div className="space-x-4 flex flex-col items-center bg-[#E3E5E8] h-full text-primary w-full dark:bg-[#1E1F22]">
            <NavigationAction />
            <Separator className="h-[2px] bg-zinc-400 dark:bg-zinc-700 rounded-md w-10 !mx-auto my-2" />
            <ScrollArea className="flex-1 w-full !m-0 px-0">
                {servers.map((server) => {
                    const notification = unreadMessageCountMap.get(server.id);

                    const totoalUnread = notification
                        ?.values()
                        .reduce((acc, value) => {
                            return (acc += value);
                        }, 0);
                    console.log("Totoal Unread Server: ", totoalUnread);

                    return (
                        <div className="mt-3" key={server.id}>
                            <NavigationItem
                                id={server.id}
                                imageUrl={server.imageUrl}
                                name={server.name}
                                totalUnread={totoalUnread}
                            />
                        </div>
                    );
                })}
            </ScrollArea>
            <div className="pb-3 !m-0 flex items-center flex-col gap-y-4">
                <ModeToggle />
                <UserButton
                    appearance={{
                        elements: {
                            avatarBox: "w-12 h-12",
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default NavigationSideBar;
