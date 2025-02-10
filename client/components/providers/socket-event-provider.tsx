"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { useSocket } from "./socket-provider";
import { decrypt } from "@/utility/app.utility";
import {
    ChannelMessageUpdatedGlobal,
    IChannel,
    IMember,
    MessageType,
} from "@/interfaces";
import { useData } from "./data-provider";
import { usePendingMessages } from "./pending-message";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

interface SocketEventContextType {
    addListener: (event: string, callback: (data: any) => void) => void;
    removeListener: (event: string, callback: (data: any) => void) => void;
    removeAllListeners: () => void;
}

const SocketEventContext = createContext<SocketEventContextType | undefined>(
    undefined
);

interface SocketEventProviderProps {
    children: ReactNode;
}

type EventListenerProps = {
    event: string;
    callback: (data: any) => void;
};

export const SocketEventProvider: React.FC<SocketEventProviderProps> = ({
    children,
}) => {
    const pathname = usePathname();
    const isAuthPage =
        pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up");

    if (isAuthPage) {
        return children;
    }

    const [listeners, setListeners] = useState<EventListenerProps[]>([]);
    const { handelRemovePendingDirectMessages } = usePendingMessages();
    const { socket, sendMessage } = useSocket();

    const {
        handleEditMessage,
        handleAddMessageConversation,
        handleUpdateChannel,
        handleDeleteChannel,
        handleupdateStatusUser,
        handleAddConversation,
        handleUpdateServer,
        handleDeleteServer,
        setMessage,
        servers,
        activeChannel,
        handleUpdatedNotifications,
    } = useData();

    const { removePendingMessageByTimestamp } = usePendingMessages();

    const router = useRouter();

    const addListener = (event: string, callback: (data: any) => void) => {
        socket?.on(event, callback);
        setListeners((prev) => [...prev, { event, callback }]);
    };

    const removeListener = (event: string, callback: (data: any) => void) => {
        socket?.off(event, callback);
        setListeners((prev) =>
            prev.filter(
                (listener) =>
                    listener.event !== event && listener.callback !== callback
            )
        );
    };

    const removeAllListeners = () => {
        listeners.forEach(({ event, callback }) => {
            socket?.off(event, callback);
        });
        setListeners([]);
    };

    const handleUpdateMessageGlobal = (data: string) => {
        const encryptedMessage = JSON.parse(
            decrypt(data)
        ) as ChannelMessageUpdatedGlobal;

        handleEditMessage({
            messageId: encryptedMessage.id,
            serverId: encryptedMessage.serverId,
            channelId: encryptedMessage.channelId,
            content: encryptedMessage.content,
            updatedAt: encryptedMessage.updatedAt,
            fileId: encryptedMessage.fileId,
            fileUrl: encryptedMessage.fileUrl,
            posterId: encryptedMessage.posterId,
            posterUrl: encryptedMessage.posterUrl,
            type: encryptedMessage.type,
            progress: undefined,
        });
    };

    const handleIncomingDirectMessage = (data: string) => {
        const message = JSON.parse(decrypt(data));

        console.log("Message data convcersation: ", message);
        handelRemovePendingDirectMessages(message.timestamp);
        handleAddMessageConversation(message);
    };

    const handleUpdateChannelData = (data: string) => {
        const decryptedData = JSON.parse(decrypt(data));
        console.log("edited channel :", decryptedData);
        handleUpdateChannel(decryptedData);
    };

    const handleUpdateDirectMessage = (message: string) => {
        const decryptedMessage = JSON.parse(decrypt(message));
        handleAddMessageConversation(decryptedMessage);
    };

    const handleUpdateChannelDeleted = (message: string) => {
        const decryptedMessage = JSON.parse(decrypt(message));
        handleDeleteChannel(decryptedMessage);
    };

    const handleGetConversation = (data: any) => {
        const conversation = JSON.parse(decrypt(data));
        handleAddConversation(conversation);
    };

    const handleUserConnected = (userId: string) => {
        handleupdateStatusUser(userId, true);
        console.log("User connected");
    };

    const handleUserDisconnected = (userId: string) => {
        handleupdateStatusUser(userId, false);
        console.log("User Disconnected");
    };

    const handleDeletedServer = (message: string) => {
        const decryptedMessage = JSON.parse(decrypt(message)) as { id: string };
        const server = servers.find(
            (server) => server.id === decryptedMessage.id
        );

        const otherServer = servers.filter((s) => s.id !== decryptedMessage.id);

        console.log("otherServer: ", otherServer);

        if (server) {
            if (otherServer.length > 0) {
                router.push(
                    `/servers/${otherServer[0].id}/channels/${otherServer[0].channels[0].id}`
                );
                console.log(
                    "Redirect sevrer",
                    `/servers/${otherServer[0].id}/channels/${otherServer[0].channels[0].id}`
                );
            } else {
                console.log("Redirect home");
                router.push("/");
            }
            handleDeleteServer(server.id);
        }
    };

    const handleAddMessageChannel = (message: string) => {
        const { serverId, channelId, timestamp, ...rest } = JSON.parse(
            decrypt(message)
        );
        setMessage(serverId, channelId, rest);
        removePendingMessageByTimestamp(timestamp);
        if (activeChannel.current && sendMessage) {
            sendMessage("channel-read", { channelId, serverId }, "POST");
            console.log("Sending message channel-read ");
        }
    };

    const handleUpdatedChannelReaded = (data: {
        id: string;
        profileId: string;
        last_read_at: Date;
        channel: IChannel;
        channel_id: string;
    }) => {
        console.log("Channel readed: ", data);
        handleUpdatedNotifications(data);
    };

    const setupListeningGlobal = () => {
        addListener("channel-readed", handleUpdatedChannelReaded);
        addListener("chat:message:update:global", handleUpdateMessageGlobal);
        addListener("chat:message:channel:global", handleAddMessageChannel);
        addListener(
            "chat:conversation:message:global",
            handleIncomingDirectMessage
        );
        addListener("USER_CONNECTED", handleUserConnected);
        addListener("USER_DISCONNECTED", handleUserDisconnected);
        addListener("conversation:messages:updated", handleUpdateDirectMessage);
        addListener("channel:update:global", handleUpdateChannelData);
        addListener("channel:deleted:global", handleUpdateChannelDeleted);
        addListener("conversation:updated:global", handleGetConversation);
        addListener("SERVER:DELETED:GLOBAL", handleDeletedServer);
        addListener("chat:channels:messages", handleAddMessageChannel);
    };

    useEffect(() => {
        setupListeningGlobal();

        return () => {
            removeAllListeners();
        };
    }, [socket, servers, sendMessage]);

    return (
        <SocketEventContext.Provider
            value={{ addListener, removeListener, removeAllListeners }}
        >
            {children}
        </SocketEventContext.Provider>
    );
};

export const useSocketEvents = (): SocketEventContextType => {
    const context = useContext(SocketEventContext);
    if (!context) {
        throw new Error(
            "useSocketEvents must be used within a SocketEventProvider"
        );
    }
    return context;
};
