"use client";
import { Member } from "@/interfaces/message.interface";
import {
    Member as CurrentMember,
    IMember,
    MemberRole,
    MessageType,
} from "@/interfaces";
import UserAvatar from "../ui/user-avatar";
import { ActionTooltip } from "../action.tooltip";
import { Edit, FileIcon, ShieldAlert, ShieldCheck, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useSocket } from "../providers/socket-provider";
import { useModal } from "@/hooks/use-modal-store";
import VideoChat from "./chat-video";
import { useParams, useRouter } from "next/navigation";
interface IChatItemProps {
    id: string;
    content: string;
    member: IMember;
    timestamp: string;
    fileUrl?: string | null;
    deleted: boolean;
    currentMember: CurrentMember;
    isUpdated: boolean;
    socketQuery: Record<string, string>;
    channelId: string;
    serverId: string;
    psoterUrl?: string;
    type: MessageType;
}

const formSchema = z.object({
    content: z.string().min(1, { message: "content is required" }),
});

const roleIconMap = {
    GUEST: null,
    MODERATOR: <ShieldCheck className="w-4 h-4 ml-2 text-indigo-500 " />,
    ADMIN: <ShieldAlert className="w-4 h-4 ml-2 text-rose-500 " />,
};

const ChatItem = ({
    id,
    content,
    currentMember,
    deleted,
    isUpdated,
    member,
    timestamp,
    fileUrl,
    channelId,
    serverId,
    type,
    psoterUrl,
}: IChatItemProps) => {
    const { isConnected, sendMessage } = useSocket();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoadingModify, setIsLoadingModify] = useState(false);
    const { onOpen } = useModal();
    const params = useParams();
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            content,
        },
    });

    useEffect(() => {
        form.reset({
            content,
        });
    }, []);

    const isAdmin = currentMember.role === MemberRole.ADMIN;
    const isModerator = currentMember.role === MemberRole.MODERATOR;
    const isOwner = currentMember.id === member.id;
    const canDeleteMessage = !deleted && (isAdmin || isModerator || isOwner);

    const isImage = type === MessageType.IMAGE;
    const isVideo = type === MessageType.VIDEO;
    const isFile = type === MessageType.FILE;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && event.keyCode === 27) {
                setIsEditing(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const isLoading = form.formState.isSubmitting;

    const onDeleteMessage = () => {
        try {
            if (!isConnected || !sendMessage)
                throw new Error("Can't send message");

            sendMessage(
                "message_modify",
                {
                    channelId,
                    serverId,
                    messageId: id,
                    method: "DELETE",
                    memberId: currentMember.id,
                },
                "POST"
            );
            setIsDeleting(false);
        } catch (error) {
            console.log(error);
        }
    };

    const onMemberClick = () => {
        if (member.id === currentMember.id) {
            return;
        }

        router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
    };

    const handleOnSubmit = (values: z.infer<typeof formSchema>) => {
        try {
            if (!isConnected || !sendMessage)
                throw new Error("Can't send message");

            sendMessage(
                "message_modify",
                {
                    channelId,
                    serverId,
                    messageId: id,
                    content: values.content,
                    method: "PATCH",
                    memberId: currentMember.id,
                },
                "POST"
            );
            setIsEditing(false);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="relative group flex items-cneter hover:bg-black/5 p-4 transition w-full">
            <div className="flex flex-col gap-x-2 w-full">
                <div className="flex items-start gap-x-2 cursor-pointer hover:drop-shadow-md transition">
                    <div
                        onClick={onMemberClick}
                        className="cursor-pointer hover:drop-shadow-md transition"
                    >
                        <UserAvatar
                            className=""
                            src={member.profile.imageUrl}
                        />
                    </div>
                    <div className="flex flex-col w-full">
                        <div className="flex items-center gap-x-2">
                            <div className="flex items-center">
                                <p
                                    onClick={onMemberClick}
                                    className="font-semibold text-sm hover:underline cursor-pointer"
                                >
                                    {member.profile.name}
                                </p>

                                {roleIconMap[member.role] && (
                                    <ActionTooltip label={member.role}>
                                        {roleIconMap[member.role]}
                                    </ActionTooltip>
                                )}
                            </div>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 ">
                                {timestamp}
                            </span>
                        </div>
                        {isImage && (
                            <>
                                {!deleted && (
                                    <a
                                        href={content || ""}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary w-48 h-48"
                                    >
                                        <img
                                            src={content || ""}
                                            alt={content}
                                            className="object-cover w-full h-full"
                                        />
                                    </a>
                                )}
                                {deleted && (
                                    <p
                                        className={cn(
                                            "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
                                        )}
                                    >
                                        {content}
                                    </p>
                                )}
                            </>
                        )}
                        {isFile && (
                            <>
                                {!deleted && (
                                    <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10 ">
                                        <FileIcon className="w-10 h-10 fill-indigo-200 stroke-indigo-400" />
                                        <a
                                            target="_blank"
                                            href={content || ""}
                                            className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                                            rel="noopener noreferrer"
                                        >
                                            {content.split("/").pop()}
                                        </a>
                                    </div>
                                )}

                                {deleted && (
                                    <p
                                        className={cn(
                                            "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
                                        )}
                                    >
                                        {content}
                                    </p>
                                )}
                            </>
                        )}

                        {isVideo && (
                            <>
                                {!deleted && (
                                    <VideoChat
                                        path={fileUrl}
                                        posterUrl={psoterUrl}
                                    />
                                )}
                                {deleted && (
                                    <p
                                        className={cn(
                                            "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
                                        )}
                                    >
                                        {content}
                                    </p>
                                )}
                            </>
                        )}

                        {!fileUrl && !isEditing && (
                            <p
                                className={cn(
                                    "text-sm text-zinc-600 dark:text-zinc-300",
                                    deleted &&
                                        "italic text-zinc-500 dark:text-zinc-400 text-xs mt-1"
                                )}
                            >
                                {content}
                                {isUpdated && !deleted && (
                                    <span className="text-[12px] mx-2 text-zinc-500 dark:text-zinc-400">
                                        (edited)
                                    </span>
                                )}
                            </p>
                        )}

                        {!fileUrl && isEditing && (
                            <Form {...form}>
                                <form
                                    className="flex items-center w-full gap-x-2 pt-2"
                                    onSubmit={form.handleSubmit(handleOnSubmit)}
                                >
                                    <FormField
                                        control={form.control}
                                        name="content"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormControl>
                                                    <div className="relative w-full">
                                                        <Input
                                                            disabled={isLoading}
                                                            placeholder="Edited message"
                                                            className="dark:text-zinc-200 text-zinc-600 p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        disabled={isLoading}
                                        className=""
                                        size="sm"
                                        variant="primary"
                                    >
                                        Save
                                    </Button>
                                </form>
                                <span className="text-lg mt-1 text-zinc-400">
                                    Press escape to cancel, enter to save
                                </span>
                            </Form>
                        )}
                    </div>
                </div>
                {canDeleteMessage && (
                    <div className="hidden group-hover:flex items-center gap-x-2 absolute p-1 top-2 right-5 bg-white dark:bg-zinc-800 border rounded-sm">
                        {canDeleteMessage && (
                            <ActionTooltip label="Edit">
                                <Edit
                                    onClick={() => setIsEditing(true)}
                                    className="cursor-pointer ml-auto w-4 h-5 text-zinc-500  hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                                />
                            </ActionTooltip>
                        )}

                        <ActionTooltip label="Delete">
                            <Trash
                                onClick={() =>
                                    onOpen("DeleteMessage", { onDeleteMessage })
                                }
                                className="cursor-pointer ml-auto w-4 h-5 text-zinc-500  hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                            />
                        </ActionTooltip>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(ChatItem);
