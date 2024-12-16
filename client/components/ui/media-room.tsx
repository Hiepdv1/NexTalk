"use client";

import "@livekit/components-styles";

import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { Loader2 } from "lucide-react";
import { useSocket } from "../providers/socket-provider";

interface IMediaRoomProps {
    chatId: string;
    video: boolean;
    audio: boolean;
}

const MediaRoom = ({ audio, chatId, video }: IMediaRoomProps) => {
    const { sendMessage } = useSocket();
    const [token, setToken] = useState<string>();

    useEffect(() => {
        if (!sendMessage) return;

        sendMessage("REQUEST:TOKEN:LIVE", {}, "POST", {});
    }, [sendMessage]);

    if (!token) {
        return (
            <div className="flex flex-col flex-1 justify-center items-center">
                <Loader2 className="w-7 h-7 text-zinc-500 animate-spin my-4" />
            </div>
        );
    }

    return (
        <LiveKitRoom
            data-lk-theme="default"
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            token={token}
            connect
            video={video}
            audio={audio}
        >
            <VideoConference />
        </LiveKitRoom>
    );
};

export default MediaRoom;
