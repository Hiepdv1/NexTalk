"use client";
import {
    IChannel,
    IConversation,
    IDirectMessage,
    IMessage,
    Member,
    MemberRole,
} from "@/interfaces";
import ChatWelcome from "./chat-welcome";
import { format } from "date-fns";
import React, {
    ElementRef,
    Fragment,
    memo,
    ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import ChatItem from "./chat-item";
import { useSocket } from "../providers/socket-provider";
import { decrypt } from "@/utility/app.utility";
import { usePendingMessages } from "@/components/providers/pending-message";
import ChatPendingMessage from "./chat-pending-message";
import { useModal } from "@/hooks/use-modal-store";
import { useData } from "../providers/data-provider";
import useQueryChat from "@/hooks/use-query-chat";
import { useSocketEvents } from "../providers/socket-event-provider";
import { Loader2 } from "lucide-react";

const DATE_FORMAT = "dd MM yyyy, HH:mm";

interface IChatMessageProps {
    name: string;
    member: Member;
    chatId: string;
    apiUrl: string;
    socketQuery: Record<string, any>;
    paramKey: "channelId" | "conversationId";
    paramValue: string;
    type: "Channel" | "Conversation";
    channel?: IChannel;
    message?: Record<string, any>;
    conversation?: IConversation;
}

const ChatMessage = ({
    chatId,
    member,
    name,
    paramKey,
    paramValue,
    socketQuery,
    type,
    channel,
    apiUrl,
    message,
    conversation,
}: IChatMessageProps) => {
    const {
        setMessage,
        handleDeleteMessage,
        handleEditMessage,
        handelSetMessageConversationArray,
        handleAddMessageConversation,
    } = useData();
    const { addListener, removeListener } = useSocketEvents();
    const { hasNextPage, fetchNextPage, isFetchingNextPage } = useQueryChat({
        apiUrl,
        message: {
            ...message,
        },
        query: {
            ...socketQuery,
        },
    });

    const chatRef = useRef<ElementRef<"div">>(null);
    const topMarkerRef = useRef<ElementRef<"div">>(null);
    const {
        pendingMessages,
        removePendingMessageByTimestamp,
        pendingDirectMessages,
        handelRemovePendingDirectMessages,
    } = usePendingMessages();
    const { socket } = useSocket();

    const [isAtTop, setIsAtTop] = useState(false);

    const messages =
        type === "Channel" ? channel?.messages : conversation?.directMessages;

    let currentPendingMessages = [];

    if (type === "Channel") {
        currentPendingMessages = pendingMessages.filter(
            (message) => message.channelId === chatId
        );
    } else {
        currentPendingMessages = pendingDirectMessages.filter(
            (msg) => msg.conversationId === conversation?.id
        );
    }

    const shouldShowChatWelcome = useMemo(() => {
        if (!hasNextPage) return true;
        if (type === "Channel" && (!channel || channel.messages.length <= 0))
            return true;
        if (type === "Conversation") return true;
        return false;
    }, [hasNextPage, channel, type]);

    const handleIncomingMessage = (data: any) => {
        const message = JSON.parse(decrypt(data));
        if (channel) {
            removePendingMessageByTimestamp(message.timestamp);
            setMessage(channel.serverId, channel.id, message);
        }
    };

    const handleOnEditMessage = (data: any) => {
        const message = JSON.parse(decrypt(data));
        handleEditMessage({
            messageId: message.id,
            channelId: message.channelId,
            content: message.content,
            serverId: socketQuery.serverId,
            updatedAt: message.updatedAt,
        });
    };

    const handleOnDeleteMessage = (data: any) => {
        const message = JSON.parse(decrypt(data)) as IMessage;
        handleDeleteMessage({
            messageId: message.id,
            channelId: message.channelId,
            content: message.content,
            serverId: socketQuery.serverId,
        });
    };

    const createScrollObserver = (options: {
        root: HTMLElement | null;
        rootMargin: string;
        threshold: number;
    }) => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setIsAtTop(true);
                } else {
                    setIsAtTop(false);
                }
            });
        }, options);

        return observer;
    };

    const handleFetchConversationMessage = (data: any) => {
        const message = JSON.parse(decrypt(data)) as IDirectMessage[];
        handelSetMessageConversationArray(message, socketQuery.conversationId);
    };

    const handleIncomingDirectMessage = (data: any) => {
        const message = JSON.parse(decrypt(data));
        handelRemovePendingDirectMessages(message.timestamp);
        handleAddMessageConversation(message);
    };

    const setupSocketListeners = () => {
        addListener(
            `chat:${socketQuery.channelId}:messages`,
            handleIncomingMessage
        );
        addListener(
            `channels:${channel?.id}:message:update`,
            handleOnEditMessage
        );
        addListener(
            `channels:${channel?.id}:message:delete`,
            handleOnDeleteMessage
        );
        addListener(
            `server:${socketQuery.serverId}:conversation:${socketQuery.conversationId}:message`,
            handleFetchConversationMessage
        );
        addListener(
            `chat:${socketQuery.serverId}:conversation:message`,
            handleIncomingDirectMessage
        );
    };

    const initializeScrollObserver = (
        chatRef: React.RefObject<HTMLDivElement>,
        topMarkerRef: React.RefObject<HTMLDivElement>
    ) => {
        const observer = createScrollObserver({
            root: chatRef.current,
            rootMargin: "80px 0px 0px 0px",
            threshold: 1.0,
        });

        const topObserverRef = topMarkerRef.current;
        if (topObserverRef) {
            observer.observe(topObserverRef);
        }

        return () => {
            if (topObserverRef) {
                observer.unobserve(topObserverRef);
            }
        };
    };

    useEffect(() => {
        const cleanupObserver = initializeScrollObserver(chatRef, topMarkerRef);

        return () => {
            cleanupObserver();
        };
    }, [channel, conversation]);

    useEffect(() => {
        const top = chatRef.current?.scrollHeight;
        if (top) {
            chatRef.current?.scrollTo(0, top);
        }
    }, [pendingMessages.length, channel?.messages.length]);

    useEffect(() => {
        if (isAtTop) {
            fetchNextPage();
        }
    }, [isAtTop, fetchNextPage]);

    useEffect(() => {
        if (!socket) return;
        const unmount = setupSocketListeners();

        return unmount;
    }, [socket, chatId, conversation]);

    useEffect(() => {
        chatRef.current?.scrollTo(0, chatRef.current?.scrollHeight || 0);
    }, [pendingMessages, pendingDirectMessages]);

    return (
        <div
            ref={chatRef}
            className="flex-1 flex flex-col pt-4 overflow-y-auto no-scrollbar"
        >
            {shouldShowChatWelcome && (
                <>
                    <div className="flex-1" />
                    <ChatWelcome name={name} type={type} />
                </>
            )}

            {hasNextPage && (
                <div className="flex justify-center">
                    {isFetchingNextPage && (
                        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin my-4" />
                    )}
                </div>
            )}

            <div className="mt-auto">
                <div className="flex flex-col-reverse">
                    {messages?.map((message, index) => {
                        return (
                            <ChatItem
                                key={message.id}
                                id={message.id}
                                content={message.content}
                                currentMember={member}
                                fileId={message.fileId}
                                fileUrl={message.fileUrl}
                                psoterUrl={message.posterUrl}
                                type={message.type}
                                deleted={message.deleted}
                                timestamp={format(
                                    new Date(message.createdAt),
                                    DATE_FORMAT
                                )}
                                isUpdated={
                                    message.updatedAt !== message.createdAt
                                }
                                socketQuery={socketQuery}
                                member={message.member}
                                channelId={channel?.id || ""}
                                serverId={channel?.serverId || ""}
                            />
                        );
                    })}
                </div>

                <div className="flex flex-col">
                    {currentPendingMessages?.map((info, index) => (
                        <ChatPendingMessage
                            key={info.timestamp}
                            imageUrl={info.userImage}
                            message={info.message}
                            name={info.name}
                            role={info.role as MemberRole}
                            timestamp={info.timestamp}
                            fileUrl={info.fileUrl}
                            progressUploaded={info.progressUploaded}
                        />
                    ))}

                    <div ref={topMarkerRef} />
                </div>
            </div>
        </div>
    );
};

export default memo(ChatMessage);
