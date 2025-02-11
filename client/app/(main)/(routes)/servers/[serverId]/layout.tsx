"use client";
import { useData } from "@/components/providers/data-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { useSocket } from "@/components/providers/socket-provider";
import ServerSideBar from "@/components/server/server-sidebar";
import { IMember } from "@/interfaces";
import { decrypt } from "@/utility/app.utility";
import { useEffect } from "react";

interface IServerIdLayout {
    children: React.ReactNode;
    params: { serverId: string };
}

const ServerIdLayout = ({ children, params }: IServerIdLayout) => {
    const {
        handleUpdateChannel,
        handleDeleteChannel,
        handleAddNewMemberInServer,
        handleOnChangeRoleMember,
    } = useData();
    const { addListener } = useSocketEvents();

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

    const handleOnUpdateRoleMember = (data: any) => {
        const decryptData = JSON.parse(decrypt(data));
        handleOnChangeRoleMember(decryptData);
    };

    useEffect(() => {
        addListener("channel:created:update", onUpdateChannel);
        addListener("channel:deleted:update", onDeleteChannel);

        addListener(
            `server:${params.serverId}:member:update:role`,
            handleOnUpdateRoleMember
        );
    }, []);

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
