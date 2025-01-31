import { FileIcon, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { ActionTooltip } from "../action.tooltip";
import UserAvatar from "../ui/user-avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { memo } from "react";
import ProgressBar from "../loadding/ProgressBar";

interface IChatPendingMessageProps {
    imageUrl: string;
    name: string;
    role: "GUEST" | "MODERATOR" | "ADMIN";
    timestamp: number;
    message: string;
    progressUploaded?: number;
    fileUrl?: string;
}

const DATE_FORMAT = "dd MM yyyy, HH:mm";

const roleIconMap = {
    GUEST: null,
    MODERATOR: <ShieldCheck className="w-4 h-4 ml-2 text-indigo-500 " />,
    ADMIN: <ShieldAlert className="w-4 h-4 ml-2 text-rose-500 " />,
};

const ChatPendingMessage = ({
    fileUrl,
    imageUrl,
    message,
    name,
    role,
    timestamp,
    progressUploaded,
}: IChatPendingMessageProps) => {
    const isImageUrl = (url: string): boolean => {
        return (
            url.includes(".jpg") ||
            url.includes(".jpeg") ||
            url.includes(".png") ||
            url.includes(".gif") ||
            url.includes(".bmp") ||
            url.includes(".webp")
        );
    };

    const isVideoUrl = (url: string): boolean => {
        return url.includes(".mp4") || url.includes(".webm");
    };

    const isImage = isImageUrl(fileUrl || "");
    const isVideo = isVideoUrl(fileUrl || "");
    const isFile = fileUrl && !isImage && !isVideo;

    return (
        <div className="relative group flex items-cneter hover:bg-black/5 p-4 transition w-full">
            <div className="flex flex-col gap-x-2 w-full">
                <div className="flex items-start gap-x-2 cursor-pointer hover:drop-shadow-md transition">
                    <UserAvatar className="" src={imageUrl} />
                    <div className="flex flex-col w-full">
                        <div className="flex items-center gap-x-2">
                            <div className="flex items-center">
                                <p className="font-semibold text-sm hover:underline cursor-pointer">
                                    {name}
                                </p>
                                <ActionTooltip label={role}>
                                    {roleIconMap[role]}
                                </ActionTooltip>
                            </div>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 ">
                                {format(new Date(timestamp), DATE_FORMAT)}
                            </span>
                        </div>

                        {!fileUrl && (
                            <p
                                className={cn(
                                    "text-sm text-zinc-600 dark:text-zinc-300"
                                )}
                            >
                                {message}
                            </p>
                        )}

                        {isImage && (
                            <div className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary w-48 h-48">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <Loader2 className="w-9 h-9 animate-spin" />
                                </div>
                            </div>
                        )}

                        {isVideo && (
                            <div className="px-2 bg-slate-400 relative w-96 h-60 my-2 max-sm:w-full dark:bg-[rgba(0,0,0,.65)]">
                                <ProgressBar
                                    progress={progressUploaded ?? 0}
                                    className="absolute top-1/2 left-0 -translate-y-1/2"
                                />
                            </div>
                        )}

                        {isFile && (
                            <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10 ">
                                <FileIcon className="w-10 h-10 fill-indigo-200 stroke-indigo-400" />
                                <div className="ml-2 flex flex-col w-full">
                                    <div
                                        className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                                        rel="noopener noreferrer"
                                    >
                                        {message.split("/").pop()}
                                    </div>
                                    <div className="mt-2 w-full max-w-96">
                                        <ProgressBar
                                            progress={progressUploaded ?? 0}
                                            className="w-full bg-zinc-500 dark:bg-zinc-300 text-black"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(ChatPendingMessage);
