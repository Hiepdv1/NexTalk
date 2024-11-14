"use client";
import NavigationSideBar from "@/components/navigation/navigation.sidebar";
import { useData } from "@/components/providers/data-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { useSocket } from "@/components/providers/socket-provider";
import { IMember } from "@/interfaces";
import { decrypt, encrypt } from "@/utility/app.utility";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface IMainLayoutProps {
    children: ReactNode;
}

const MainLayout = (props: IMainLayoutProps) => {
    const { children } = props;
    const { socket, sendMessage } = useSocket();
    const {
        handleUpdateServer,
        handleDeleteServer,
        handleAddNewMemberInServer,
    } = useData();
    const { addListener, removeListener } = useSocketEvents();
    const router = useRouter();

    const updateServer = (data: any) => {
        const server = JSON.parse(decrypt(data));
        handleUpdateServer(server);
    };

    const updateDeletedServer = (data: any) => {
        const server = JSON.parse(decrypt(data));
        handleDeleteServer(server.id);
    };

    useEffect(() => {
        if (!socket) return;

        addListener("server:created:update", updateServer);
        addListener("server:deleted:update", updateDeletedServer);

        return () => {
            removeListener("server:created:update", updateServer);
            removeListener("server:deleted:update", updateDeletedServer);
        };
    }, [socket]);

    return (
        <div className="h-full">
            <div className="hidden md:flex h-full w-[72px] z-30 flex-col fixed inset-y-0">
                <NavigationSideBar />
            </div>
            <main className="md:pl-[72px] h-full">{children}</main>
        </div>
    );
};

export default MainLayout;
