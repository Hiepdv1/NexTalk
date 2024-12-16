"use client";
import React, { createContext, useCallback, useContext, useState } from "react";

export interface IPendingMessage {
    userId: string;
    message: string;
    timestamp: number;
    userImage: string;
    name: string;
    role: string;
    channelId: string;
    fileUrl?: string;
    progressUploaded?: number;
}

export interface IPendingDirectMessage {
    userId: string;
    message: string;
    timestamp: number;
    userImage: string;
    name: string;
    role: string;
    conversationId: string;
    fileUrl?: string;
    progressUploaded?: number;
}

interface PendingMessagesContextType {
    pendingMessages: IPendingMessage[];
    pendingDirectMessages: IPendingDirectMessage[];
    addPendingMessage: (data: IPendingMessage) => void;
    removePendingMessageByTimestamp: (timestamp: number) => void;
    updatePendingMessage: (data: Partial<IPendingMessage>) => void;
    handleAddPendingDirectMessage: (data: IPendingDirectMessage) => void;
    handelRemovePendingDirectMessages: (timestamp: number) => void;
}

const PendingMessagesContext = createContext<
    PendingMessagesContextType | undefined
>(undefined);

export const PendingMessagesProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [pendingMessages, setPendingMessages] = useState<IPendingMessage[]>(
        []
    );

    const [pendingDirectMessages, setPendingDirectMessages] = useState<
        IPendingDirectMessage[]
    >([]);

    const addPendingMessage = useCallback((data: IPendingMessage) => {
        setPendingMessages((prev) => [
            ...prev,
            { ...data, progressUploaded: 0 },
        ]);
    }, []);

    const updatePendingMessage = useCallback(
        (data: Partial<IPendingMessage>) => {
            setPendingMessages((prev) =>
                prev.map((msg) =>
                    msg.timestamp === data.timestamp ? { ...msg, ...data } : msg
                )
            );
        },
        []
    );

    const removePendingMessageByTimestamp = useCallback((timestamp: number) => {
        setPendingMessages((prev) =>
            prev.filter((msg) => msg.timestamp !== timestamp)
        );
    }, []);

    const handleAddPendingDirectMessage = (data: IPendingDirectMessage) => {
        setPendingDirectMessages((prevDirectMessages) => {
            const cloneDirectMessage = [...prevDirectMessages];

            const conversation = cloneDirectMessage.find(
                (con) => con.conversationId === data.conversationId
            );

            if (!conversation) return prevDirectMessages;

            cloneDirectMessage.push(data);

            return cloneDirectMessage;
        });
    };

    const handelRemovePendingDirectMessages = (timestamp: number) => {
        setPendingDirectMessages((prevDirectMessages) => {
            return prevDirectMessages.filter(
                (msg) => msg.timestamp !== timestamp
            );
        });
    };

    return (
        <PendingMessagesContext.Provider
            value={{
                pendingMessages,
                pendingDirectMessages,
                addPendingMessage,
                removePendingMessageByTimestamp,
                updatePendingMessage,
                handleAddPendingDirectMessage,
                handelRemovePendingDirectMessages,
            }}
        >
            {children}
        </PendingMessagesContext.Provider>
    );
};

export const usePendingMessages = () => {
    const context = useContext(PendingMessagesContext);
    if (!context) {
        throw new Error(
            "usePendingMessages must be used within a PendingMessagesProvider"
        );
    }
    return context;
};
