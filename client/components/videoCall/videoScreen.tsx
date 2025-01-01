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
        <div className={`bg-black md:mb-0 h-full`}>
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
        </div>
    );
};

export default memo(VideoScreenComponent);
