"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "./socket-provider";

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
    const [listeners, setListeners] = useState<EventListenerProps[]>([]);
    const { socket } = useSocket();

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

    useEffect(() => {
        return () => {
            removeAllListeners();
        };
    }, [socket]);

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
