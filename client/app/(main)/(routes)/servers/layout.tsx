"use client";
import NavigationSideBar from "@/components/navigation/navigation.sidebar";
import { useData } from "@/components/providers/data-provider";
import { useSocket } from "@/components/providers/socket-provider";
import { decrypt } from "@/utility/app.utility";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

interface IMainLayoutProps {
    children: ReactNode;
}

const MainLayout = (props: IMainLayoutProps) => {
    const { children } = props;
    const { socket } = useSocket();
    const { handleUpdateServer, handleDeleteServer, servers } = useData();
    const router = useRouter();

    useEffect(() => {
        if (!socket) return;
        const updateServer = (data: any) => {
            const server = JSON.parse(decrypt(data));
            handleUpdateServer(server);
        };

        const updateDeletedServer = (data: any) => {
            const server = JSON.parse(decrypt(data));
            handleDeleteServer(server.id);
        };

        socket?.on("server:created:update", updateServer);
        socket?.on("server:deleted:update", updateDeletedServer);

        return () => {
            socket?.off("server:created:update", updateServer);
            socket?.off("server:deleted:update", updateDeletedServer);
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
