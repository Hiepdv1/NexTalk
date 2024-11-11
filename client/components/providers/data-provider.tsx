"use client";
import api from "@/API/axios";
import {
    IServer,
    IProfile,
    IMessage,
    IChannel,
    IConversation,
} from "@/interfaces";
import { useUser } from "@clerk/nextjs";
import { redirect, useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface IDataProvider {
    servers: IServer[];
    conversations: IConversation[];
    profile: IProfile | null;

    setProfile: (data: IProfile) => void;
    setServers: (data: IServer[]) => void;
    setMessage: (serverId: string, channelId: string, data: IMessage) => void;
    handleEditMessage: (data: {
        messageId: string;
        serverId: string;
        channelId: string;
        content: string;
        updatedAt: Date;
    }) => void;

    handleDeleteMessage: (data: {
        messageId: string;
        serverId: string;
        channelId: string;
        content: string;
    }) => void;

    handleUpdateChannel: (data: IChannel) => void;
    handleUpdateServer: (data: IServer) => void;

    handleDeleteServer: (serverId: string) => void;
    handleDeleteChannel: (data: {
        channelId: string;
        serverId: string;
    }) => void;

    setMessageArray: (data: {
        serverId: string;
        channelId: string;
        messages: IMessage[];
    }) => void;

    handleAddConversation: (data: IConversation) => void;
}

const DataContext = createContext<IDataProvider | undefined>(undefined);

const DataProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const [servers, setServers] = useState<IServer[]>([]);
    const [conversations, setConversations] = useState<IConversation[]>([]);

    const [profile, setProfile] = useState<IProfile | null>(null);
    const pathname = usePathname();
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

    useEffect(() => {
        const fetchData = async () => {
            const resProfile = await api.post("/user", {
                data: {
                    userId: user?.id.toString(),
                    name: `${user?.firstName} ${(user?.lastName || "").trim()}`,
                    email: user?.emailAddresses[0].emailAddress,
                    imageUrl: user?.imageUrl,
                },
            });
            const resServersData = await api.get("/servers");

            setServers(resServersData.data.data as any);
            setProfile(resProfile.data as any);
        };

        if (user && isLoaded) {
            fetchData().finally(() => setIsLoading(false));
        }
    }, [user, isLoaded]);

    if (isAuthPage) {
        return children;
    }

    const setMessage = (
        serverId: string,
        channelId: string,
        data: IMessage
    ) => {
        setServers((prevServers) => {
            const updatedServers = [...prevServers];
            const server = updatedServers.find(
                (server) => server.id === serverId
            );
            if (!server) return prevServers;

            const channel = server.channels.find(
                (channel) => channel.id === channelId
            );
            if (!channel) return prevServers;

            const isMessageExist = channel.messages.some(
                (message) => message.id === data.id
            );
            if (isMessageExist) return prevServers;

            channel.messages = [data, ...channel.messages];

            return updatedServers;
        });
    };

    const handleDeleteMessage = ({
        channelId,
        content,
        messageId,
        serverId,
    }: {
        messageId: string;
        serverId: string;
        channelId: string;
        content: string;
    }) => {
        setServers((prevServers) => {
            const updatedServers = [...prevServers];
            const server = updatedServers.find(
                (server) => server.id === serverId
            );
            if (!server) return prevServers;

            const channel = server.channels.find(
                (channel) => channel.id === channelId
            );
            if (!channel) return prevServers;

            const message = channel.messages.find(
                (message) => message.id === messageId
            );
            if (!message) return prevServers;

            if (message.content === content && message.deleted === true)
                return prevServers;

            message.content = content;
            message.deleted = true;

            return updatedServers;
        });
    };

    const setMessageArray = ({
        serverId,
        channelId,
        messages,
    }: {
        serverId: string;
        channelId: string;
        messages: IMessage[];
    }) => {
        setServers((prevServers) => {
            const cloneServers = [...prevServers];

            const server = cloneServers.find((s) => s.id === serverId);

            if (!server) return prevServers;

            const channel = server.channels.find((c) => c.id === channelId);

            if (!channel) return prevServers;

            channel.messages = [...channel.messages, ...messages];

            return cloneServers;
        });
    };

    const handleUpdateServer = (data: IServer) => {
        setServers((prevServers) => {
            const updatedServers = [...prevServers];
            const server = updatedServers.find(
                (server) => server.id === data.id
            );
            if (server) return prevServers;

            const channel = data.channels[0];

            if (!channel.messages) channel.messages = [] as any;
            if (!channel.members) channel.members = [...data.members];

            updatedServers.push(data);

            return updatedServers;
        });
    };

    const handleUpdateChannel = (data: IChannel) => {
        setServers((prevServers) => {
            const updatedServers = [...prevServers];
            const server = updatedServers.find(
                (server) => server.id === data.serverId
            );
            if (!server) return prevServers;

            const channel = server.channels.find(
                (channel) => channel.id === data.id
            );

            if (channel) return updatedServers;

            if (!data.messages) data.messages = [];
            if (!data.members) data.members = [...server.members];

            console.log("Update channel: ", data);

            server.channels.push(data);

            return updatedServers;
        });
    };

    const handleDeleteChannel = ({
        channelId,
        serverId,
    }: {
        channelId: string;
        serverId: string;
    }) => {
        setServers((prevServers) => {
            const cloneServers = [...prevServers];

            const server = cloneServers.find(
                (server) => server.id === serverId
            );

            if (!server) return prevServers;

            const channels = server.channels.filter(
                (channel) => channel.id !== channelId
            );

            if (channels.length === server.channels.length) return prevServers;

            server.channels = channels;

            return cloneServers;
        });
    };

    const handleDeleteServer = (serverId: string) => {
        setServers((prevServers) => {
            const cloneServers = [...prevServers];

            const updatedServers = cloneServers.filter(
                (server) => server.id !== serverId
            );

            if (updatedServers.length === prevServers.length) {
                return prevServers;
            }

            return updatedServers;
        });
    };

    const handleEditMessage = ({
        channelId,
        content,
        messageId,
        serverId,
        updatedAt,
    }: {
        messageId: string;
        serverId: string;
        channelId: string;
        content: string;
        updatedAt: Date;
    }) => {
        setServers((prevServers) => {
            const updatedServers = [...prevServers];
            const server = updatedServers.find(
                (server) => server.id === serverId
            );
            if (!server) return prevServers;

            const channel = server.channels.find(
                (channel) => channel.id === channelId
            );
            if (!channel) return prevServers;

            const message = channel.messages.find(
                (message) => message.id === messageId
            );
            if (!message) return prevServers;

            if (message.content === content && message.updatedAt === updatedAt)
                return prevServers;

            message.content = content;
            message.updatedAt = updatedAt;

            return updatedServers;
        });
    };

    const handleAddConversation = (data: IConversation) => {
        setConversations((prevConversations) => {
            const cloneConversation = [...prevConversations];

            const existingConversation = cloneConversation.find(
                (conversation) => conversation.id === data.id
            );

            if (existingConversation) return prevConversations;

            cloneConversation.push(data);
            return cloneConversation;
        });
    };

    if (isLoading) {
        return null;
    }

    return (
        <DataContext.Provider
            value={{
                servers,
                conversations,
                profile,
                setProfile,
                setServers,
                setMessage,
                handleEditMessage,
                handleDeleteMessage,
                handleUpdateChannel,
                handleUpdateServer,
                handleDeleteServer,
                handleDeleteChannel,
                setMessageArray,
                handleAddConversation,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

export default DataProvider;
