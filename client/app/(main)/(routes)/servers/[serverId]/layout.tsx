"use client";
import { useData } from "@/components/providers/data-provider";
import { useSocket } from "@/components/providers/socket-provider";
import ServerSideBar from "@/components/server/server-sidebar";
import { decrypt } from "@/utility/app.utility";
import { useEffect } from "react";

interface IServerIdLayout {
    children: React.ReactNode;
    params: { serverId: string };
}

const ServerIdLayout = ({ children, params }: IServerIdLayout) => {
    const { handleUpdateChannel, handleDeleteChannel } = useData();
    const { socket } = useSocket();

    useEffect(() => {
        const onUpdateChannel = (data: any) => {
            const channel = JSON.parse(decrypt(data));
            handleUpdateChannel(channel);
        };

        const onDeleteChannel = (data: any) => {
            const channel = JSON.parse(decrypt(data));
            handleDeleteChannel({
                channelId: channel.id,
                serverId: channel.serverId,
            });
        };

        socket?.on("channel:created:update", onUpdateChannel);
        socket?.on("channel:deleted:update", onDeleteChannel);

        return () => {
            socket?.off("channel:created:update", onUpdateChannel);
            socket?.off("channel:deleted:update", onDeleteChannel);
        };
    }, [socket]);

    return (
        <div className="h-full ">
            <div className="hidden md:flex w-60 z-20 flex-col fixed inset-y-0">
                <div className="flex flex-col h-full text-primary w-full dark:bg-[#2B2D31] bg-[#F2F3F5]">
                    <ServerSideBar serverId={params.serverId} />
                </div>
            </div>
            <main className="h-full md:pl-60">{children}</main>
        </div>
    );
};

export default ServerIdLayout;
