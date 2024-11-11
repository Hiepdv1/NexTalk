"use client";

import { ChatInputSchema } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { number, z } from "zod";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import qs from "query-string";
import { PostRequest } from "@/API/api";
import { useSocket } from "../providers/socket-provider";
import { memo, useEffect, useRef } from "react";
import { useModal } from "@/hooks/use-modal-store";
import EmojiPicker from "../emoji-picker";
import { usePendingMessages } from "@/components/providers/pending-message";
import { useUser } from "@clerk/nextjs";
import { IChannel, IMember, Member } from "@/interfaces";
import { AxiosProgressEvent } from "axios";
import { RequestUploadFileMessage } from "@/API";

interface IChatInputProps {
    apiUrl: string;
    query: Record<string, any>;
    name: string;
    type: "conversation" | "channel";
    member: IMember;
    channel?: IChannel;
}

const ChatInput = ({
    apiUrl,
    name,
    query,
    type,
    member,
    channel,
}: IChatInputProps) => {
    const { onOpen } = useModal();
    const { sendMessage, socket } = useSocket();
    const {
        addPendingMessage,
        updatePendingMessage,
        removePendingMessageByTimestamp,
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

    useEffect(() => {
        if (!socket) return;

        socket.on("ping", () => {
            socket.emit("pong");
        });

        socket.on("error", (error: any) => {
            console.error("Socket Error: ", error);
        });

        return () => {
            socket.off("ping");
        };
    }, [socket]);

    const onSubmit = (value: z.infer<typeof ChatInputSchema>) => {
        try {
            if (Date.now() - lastEnter.current < 500) return;
            lastEnter.current = Date.now();

            if (!sendMessage || !isSignedIn || !user) return;

            const timestamp = Date.now();

            if (type === "channel" && channel) {
                sendMessage(
                    "send_message",
                    {
                        content: value.content,
                        channelId: channel.id,
                        memberId: query.memberId,
                        serverId: query.serverId,
                        timestamp,
                    },
                    "POST"
                );
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
        updatePendingMessage({
            timestamp,
            progressUploaded: percent,
        });
    };

    const handleUpLoadfile = async (values: {
        file: File;
        pathFile: string;
    }) => {
        if (!user || !sendMessage) return;

        const file = values.file;
        const timestamp = Date.now();

        if (channel && type === "conversation") {
            addPendingMessage({
                channelId: channel.id,
                message: file.name,
                name: `${user.firstName} ${user.lastName || ""}`,
                role: member.role,
                timestamp,
                userId: user.id,
                userImage: user.imageUrl,
                fileUrl: values.pathFile,
            });
        }

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
            removePendingMessageByTimestamp(timestamp);
        }
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
                                <div className="relative p-4 pb-6">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpen("MessageFile", {
                                                onUploadFile: handleUpLoadfile,
                                            })
                                        }
                                        className="absolute top-7 left-8 h-6 w-6 bg-zinc-500 dark:bg-zinc-400 hover:bg-zinc-600 dark:hover:bg-zinc-300 transition rounded-full p-1 flex items-center  justify-center"
                                    >
                                        <Plus className="text-white dark:text-[#313338]" />
                                    </button>
                                    <Input
                                        className="px-14 py-6 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                                        disabled={isLoading}
                                        placeholder={`Message ${
                                            type === "conversation" ? name : "#"
                                        }`}
                                        {...field}
                                    />
                                    <div className="absolute top-7 right-8">
                                        <EmojiPicker
                                            onChange={(emoji: string) =>
                                                field.onChange(
                                                    `${field.value} ${emoji}`
                                                )
                                            }
                                        />
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
