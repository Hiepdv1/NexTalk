"use client";
import {
    generateHmac,
    generateNonce,
    generateRequestId,
    getClientIp,
} from "@/utility/request-signature";
import { useAuth } from "@clerk/nextjs";
import {
    createContext,
    MutableRefObject,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { io as ClientIO, Socket } from "socket.io-client";
import { getCookie } from "cookies-next";
import { decrypt, encrypt } from "@/utility/app.utility";

interface ISocketProviderProps {
    children: React.ReactNode;
}

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    sendMessage?: (
        event: string,
        message: any,
        method?: "GET" | "POST",
        query?: any
    ) => void;
    StunServers?: MutableRefObject<StunServer[]>;
};

type StunServer = {
    url: string;
    urls: string;
    username?: string;
    credential?: string;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

const SocketProvider = ({ children }: ISocketProviderProps) => {
    const { getToken, isSignedIn } = useAuth();
    const socket = useRef<Socket | null>(null);
    const StunServers: MutableRefObject<Array<StunServer>> = useRef([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const connectSocket = () => {
            const token = getCookie("__session");
            const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/media`;

            const clientSocket = ClientIO(url, {
                auth: {
                    authorization: `Bearer ${token}`,
                },
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 10000,
                randomizationFactor: 0.5,
                withCredentials: true,
                transports: ["websocket"],
            });

            socket.current = clientSocket;

            clientSocket.on("connect", () => {
                console.log("Socket connected!");
                setIsConnected(true);
            });

            clientSocket.on("disconnect", () => {
                console.log("Socket disconnected");
                setIsConnected(false);
            });

            clientSocket.on("reconnect", (attempt) => {
                console.log("Socket reconnected after", attempt, "attempts");
                setIsConnected(true);
            });

            clientSocket.on("reconnect_failed", () => {
                console.log("Socket reconnect failed");
                setIsConnected(false);
            });

            clientSocket.on("STUN:SERVERS", (message: string) => {
                handleStunServers(message);
            });

            clientSocket.on("STUN:SERVERS:UPDATED", (message: string) => {
                handleStunServers(message);
            });
        };

        if (!isConnected) {
            connectSocket();
        }

        return () => {
            if (socket.current) {
                console.log("Disconnecting socket...");
                socket.current.disconnect();
            }
        };
    }, [isSignedIn, getToken]);

    function handleStunServers(message: string) {
        const decryptMessage = JSON.parse(decrypt(message)) as StunServer[];
        StunServers.current = decryptMessage;
        console.log("Stun Server: ", decryptMessage);
    }

    const sendMessage = useCallback(
        (
            event: string,
            message: any,
            methodWs?: "GET" | "POST",
            query?: any
        ) => {
            if (!socket.current || !isConnected) {
                console.error("Socket instance not found");
                return;
            }

            if (isSignedIn) {
                console.log("Socket sendding");
                const nonce = generateNonce();
                const requestId = generateRequestId();
                const timestamp = new Date().getTime();
                const userAgent = navigator.userAgent;
                const token = getCookie("__session");

                const encryptMesssage = encrypt(JSON.stringify(message));

                const messageParam = `url:${event}|body:${encryptMesssage}|nonce:${nonce}|timestamp:${timestamp}|requestId:${requestId}|userAgent:${userAgent}`;

                const signature = generateHmac(messageParam);

                const payload = {
                    message: encryptMesssage,
                    headers: {
                        "x-request-nonce": nonce,
                        "x-timestamp": timestamp,
                        "x-request-id": requestId,
                        "x-client-id":
                            process.env.NEXT_PUBLIC_SIGNATURE_CLIENT_ID,
                        "x-user-agent": userAgent,
                        "x-signature": signature,
                        "x-socket-url": event,
                    },
                    authorization: `Bearer ${token}`,
                    method: methodWs || "GET",
                    query,
                };

                socket.current.emit(event, payload);
            } else {
                console.error("Socket is not connected");
            }
        },
        [socket.current, isConnected]
    );

    return (
        <SocketContext.Provider
            value={{
                socket: socket.current,
                isConnected,
                sendMessage,
                StunServers,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;

export const useSocket = () => {
    return useContext(SocketContext);
};
