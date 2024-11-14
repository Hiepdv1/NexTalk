import qs from "query-string";
import { useParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSocket } from "@/components/providers/socket-provider";
import { useData } from "@/components/providers/data-provider";
import { decrypt } from "@/utility/app.utility";
import { useEffect, useState } from "react";

interface IChatQueryProps {
    query: Record<string, any>;
    apiUrl: string;
    message: Record<string, any>;
}

const useQueryChat = ({ apiUrl, query, message }: IChatQueryProps) => {
    const { isConnected, sendMessage, socket } = useSocket();
    const { setMessageArray, servers } = useData();
    const params = useParams();

    const getServerAndChannel = () => {
        const server = servers.find((s) => s.id === query.serverId);
        if (!server) return null;
        const channel = server.channels.find((c) => c.id === query.channelId);
        if (!channel) return null;
        return { server, channel };
    };

    const fetchMessages = async ({ pageParam = 1 }) => {
        if (!isConnected || !sendMessage || !socket) {
            throw new Error("Socket not connected");
        }

        const serverAndChannel = getServerAndChannel();
        if (!serverAndChannel) return { nextPage: false };

        const { channel } = serverAndChannel;

        let cursor =
            channel.messages.length > 0
                ? channel.messages[channel.messages.length - 1].id
                : null;

        sendMessage(apiUrl, { ...message, page: pageParam }, "POST", {
            ...query,
            cursor,
        });

        return new Promise((resolve, reject) => {
            socket.once(
                `messages:server:${query.serverId}:channel:${query.channelId}`,
                (response) => {
                    if (!response) {
                        reject(new Error("No response from server"));
                        return;
                    }

                    const { messages, nextCursor } = JSON.parse(
                        decrypt(response)
                    );

                    setMessageArray({
                        serverId: query.serverId,
                        channelId: query.channelId,
                        messages,
                    });

                    resolve({ nextPage: nextCursor ?? false });
                }
            );
        });
    };

    const { fetchNextPage, hasNextPage, isFetchingNextPage, status } =
        useInfiniteQuery({
            queryKey: ["chatMessages", params],
            queryFn: fetchMessages,
            getNextPageParam: (lastPage: any) => lastPage?.nextPage,
            initialPageParam: 1,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            enabled: isConnected,
        });

    return {
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status,
    };
};

export default useQueryChat;
