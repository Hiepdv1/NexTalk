import React, { memo, useEffect, useRef, useState } from "react";

interface IVideoScreenComponentProps {
    id: string;
    participantId: string;
    stream: MediaStream;
    isLocal: boolean;
}

const VideoScreenComponent = ({
    consumerScreens,
}: {
    consumerScreens: IVideoScreenComponentProps;
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (videoRef.current && consumerScreens.stream) {
            const videoTracks = consumerScreens.stream.getVideoTracks();
            const audioStracks = consumerScreens.stream.getAudioTracks();

            if (videoTracks.length > 0) {
                videoRef.current.srcObject = new MediaStream(videoTracks);
                if (!consumerScreens.isLocal && audioRef.current) {
                    audioRef.current.srcObject = new MediaStream(audioStracks);
                    audioRef.current.muted = false;
                    audioRef.current.volume = 1.0;
                    audioRef.current
                        .play()
                        .catch((err: unknown) => console.error(err));
                }
            } else {
                console.error("Stream haven't any track ready");
            }
        }
    }, [consumerScreens, videoRef.current, audioRef.current]);

    return (
        <div className={`bg-black md:mb-0 h-full relative`}>
            <div className="h-full w-full">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={true}
                    className="w-full h-full object-contain contrast-150"
                />
            </div>
            <div className="hidden">
                <audio autoPlay playsInline ref={audioRef} />
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                <span className="animate-pulse w-2 h-2 bg-red-600 rounded-full"></span>
                <span className="text-white font-semibold text-xs tracking-wider animate-pulse px-1 py-[2px] bg-red-600 rounded">
                    LIVE
                </span>
            </div>
        </div>
    );
};

export default memo(VideoScreenComponent);
