"use client";
import NavigationSideBar from "@/components/navigation/navigation.sidebar";
import { useData } from "@/components/providers/data-provider";
import { useSocketEvents } from "@/components/providers/socket-event-provider";
import { useSocket } from "@/components/providers/socket-provider";
import { decrypt } from "@/utility/app.utility";
import { ReactNode, useEffect } from "react";

interface IMainLayoutProps {
    children: ReactNode;
}

const MainLayout = (props: IMainLayoutProps) => {
    const { children } = props;
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;
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
