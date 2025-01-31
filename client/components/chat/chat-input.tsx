"use client";

import { ChatInputSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { number, z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Send } from "lucide-react";
import qs from "query-string";
import { PostRequest } from "@/API/api";
import { useSocket } from "../providers/socket-provider";
import { ClipboardEvent, memo, useEffect, useRef, useState } from "react";
import { useModal } from "@/hooks/use-modal-store";
import EmojiPicker from "../emoji-picker";
import { usePendingMessages } from "@/components/providers/pending-message";
import { useUser } from "@clerk/nextjs";
import { IChannel, IConversation, IMember, Member } from "@/interfaces";
import { AxiosProgressEvent } from "axios";
import { RequestUploadFileMessage } from "@/API";
import Image from "next/image";

interface IChatInputProps {
    apiUrl: string;
    query: Record<string, any>;
    name: string;
    type: "conversation" | "channel";
    member: IMember;
    channel?: IChannel;
    conversation?: IConversation;
}

const ChatInput = ({
    apiUrl,
    name,
    query,
    type,
    member,
    channel,
    conversation,
}: IChatInputProps) => {
    const { onOpen } = useModal();
    const [image, setImage] = useState<string | null>(null);
    const { sendMessage, socket } = useSocket();
    const {
        addPendingMessage,
        updatePendingMessage,
        updatePendingDirectMessages,
        removePendingMessageByTimestamp,
        handelRemovePendingDirectMessages,
        handleAddPendingDirectMessage,
    } = usePendingMessages();
    const { user, isLoaded, isSignedIn } = useUser();
    const lastEnter = useRef<number>(0);

    const form = useForm<z.infer<typeof ChatInputSchema>>({
        resolver: zodResolver(ChatInputSchema),
        defaultValues: {
            content: "",
        },
    });

    const isLoading = form.formState.isLoading;

    const setupSocketListeners = () => {
        if (!socket) return;

        socket.on("ping", () => {
            socket.emit("pong");
        });

        socket.on("error", (error: any) => {
            console.error("Socket Error: ", error);
        });

        return () => {
            socket.off("ping");
            socket.off("error");
        };
    };

    useEffect(() => {
        setupSocketListeners();
    }, [socket]);

    const handleSendMessageChannel = (
        timestamp: number,
        value: z.infer<typeof ChatInputSchema>,
        channelId: string
    ) => {
        if (!sendMessage || !user) return;
        addPendingMessage({
            channelId,
            timestamp,
            message: value.content,
            name: `${user.firstName} ${user.lastName || ""}`,
            role: member.role,
            userId: user.id,
            userImage: user.imageUrl,
        });
        sendMessage(
            "send_message",
            {
                content: value.content,
                channelId: channelId,
                memberId: query.memberId,
                serverId: query.serverId,
                timestamp,
            },
            "POST"
        );
    };

    const handleSendMessageConversation = (
        timestamp: number,
        value: z.infer<typeof ChatInputSchema>
    ) => {
        if (!sendMessage || !user || !conversation) return;
        console.log("Send Conversation message: ", conversation);
        handleAddPendingDirectMessage({
            conversationId: conversation.id,
            message: value.content,
            name: `${user.firstName} ${user.lastName || ""}`,
            role: member.role,
            userId: user.id,
            userImage: user.imageUrl,
            timestamp,
        });
        sendMessage(
            "send_message_conversation",
            {
                content: value.content,
                memberId: query.memberId,
                serverId: query.serverId,
                otherMemberId: query.otherMemberId,
                timestamp,
            },
            "POST"
        );
    };

    const onSubmit = (value: z.infer<typeof ChatInputSchema>) => {
        try {
            if (Date.now() - lastEnter.current < 500) return;
            lastEnter.current = Date.now();

            if (!isSignedIn || !user) return;

            const timestamp = Date.now();

            if (type === "channel" && channel) {
                handleSendMessageChannel(timestamp, value, channel.id);
            } else if (type === "conversation") {
                handleSendMessageConversation(timestamp, value);
            }

            form.reset();
        } catch (err) {
            console.log(err);
        }
    };

    const handleOnProgress = (
        timestamp: number,
        progressEvent: AxiosProgressEvent,
        totalSize: number
    ) => {
        const percent = Math.floor((progressEvent.loaded / totalSize) * 100);
        if (type === "channel") {
            updatePendingMessage({
                timestamp,
                progressUploaded: percent,
            });
        } else {
            updatePendingDirectMessages({
                timestamp,
                progressUploaded: percent,
            });
        }
    };

    const handleIncomingMessage = (values: {
        file: File;
        pathFile: string;
        timestamp: number;
    }) => {
        if (!user) return;

        console.log("Incoming message");

        if (channel && type === "channel") {
            addPendingMessage({
                channelId: channel.id,
                message: values.file.name,
                name: `${user.firstName} ${user.lastName || ""}`,
                role: member.role,
                timestamp: values.timestamp,
                userId: user.id,
                userImage: user.imageUrl,
                fileUrl: values.pathFile,
            });
        } else if (type === "conversation") {
            console.log("Add Pending Conversation message");
            handleAddPendingDirectMessage({
                message: values.file.name,
                name: `${user.firstName} ${user.lastName || ""}`,
                role: member.role,
                timestamp: values.timestamp,
                userId: user.id,
                userImage: user.imageUrl,
                fileUrl: values.pathFile,
                conversationId: query.conversationId,
            });
        }
    };

    const handleUpLoadfile = async (values: {
        file: File;
        pathFile: string;
    }) => {
        const file = values.file;
        const timestamp = Date.now();

        handleIncomingMessage({ ...values, timestamp });

        const url = qs.stringifyUrl({
            url: apiUrl || "",
            query,
        });

        const res = await RequestUploadFileMessage(
            url,
            { file },
            { headers: { "Content-Type": "multipart/form-data" } },
            (progressEvent: AxiosProgressEvent) => {
                handleOnProgress(timestamp, progressEvent, file.size);
            }
        );

        if (res?.data.statusCode == 200) {
            if (type === "channel") {
                removePendingMessageByTimestamp(timestamp);
            } else {
                handelRemovePendingDirectMessages(timestamp);
            }
        }
    };

    const handleOnPast = (event: ClipboardEvent<HTMLInputElement>) => {
        const items = event.clipboardData.items;

        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) {
                    const imageUrl = URL.createObjectURL(file);
                    setImage(imageUrl);
                }
            }
        }
    };

    const handleClosePreviewImage = () => {
        setImage(null);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="relative p-4 pb-6 flex flex-col">
                                    {image && (
                                        <div className="flex">
                                            <div className="relative w-20 h-20">
                                                <img
                                                    alt="image/preview"
                                                    src={image}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    className="absolute top-2 right-2"
                                                    onClick={
                                                        handleClosePreviewImage
                                                    }
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        strokeWidth={1.5}
                                                        stroke="currentColor"
                                                        className="size-6"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative flex items-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpen("MessageFile", {
                                                    onUploadFile:
                                                        handleUpLoadfile,
                                                })
                                            }
                                            className="absolute top-1/2 -translate-y-1/2 left-4 h-6 w-6 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                                        >
                                            <Plus className="text-white dark:text-[#313338]" />
                                        </button>
                                        <Input
                                            className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                                            disabled={isLoading}
                                            placeholder={`Message ${
                                                type === "conversation"
                                                    ? name
                                                    : "#"
                                            }`}
                                            onPaste={handleOnPast}
                                            {...field}
                                        />
                                        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2">
                                            <EmojiPicker
                                                onChange={(emoji: string) =>
                                                    field.onChange(
                                                        `${field.value} ${emoji}`
                                                    )
                                                }
                                            />
                                            <button
                                                type="submit"
                                                className="md:hidden h-6 w-6 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center justify-center"
                                                disabled={isLoading}
                                            >
                                                <Send className="h-4 w-4 text-white dark:text-[#313338]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
};

export default memo(ChatInput);
