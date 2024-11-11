"use client";
import React, { createContext, useCallback, useContext, useState } from "react";

interface PendingMessage {
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

interface PendingMessagesContextType {
    pendingMessages: PendingMessage[];
    addPendingMessage: (data: PendingMessage) => void;
    removePendingMessageByTimestamp: (timestamp: number) => void;
    updatePendingMessage: (data: Partial<PendingMessage>) => void;
}

const PendingMessagesContext = createContext<
    PendingMessagesContextType | undefined
>(undefined);

export const PendingMessagesProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>(
        []
    );
    const addPendingMessage = useCallback((data: PendingMessage) => {
        setPendingMessages((prev) => [
            ...prev,
            { ...data, progressUploaded: 0 },
        ]);
    }, []);

    const updatePendingMessage = useCallback(
        (data: Partial<PendingMessage>) => {
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

    return (
        <PendingMessagesContext.Provider
            value={{
                pendingMessages,
                addPendingMessage,
                removePendingMessageByTimestamp,
                updatePendingMessage,
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
