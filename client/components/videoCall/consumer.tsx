import { memo, useEffect, useRef, useState } from "react";

interface IConsumerProps {
    roomId: string;
    stream: MediaStream;
    isLocal?: boolean;
}

const Consumer = memo(({ stream, isLocal = false }: IConsumerProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (!stream) {
            console.log("No stream provided");
            return;
        }

        console.log("Stream received:", {
            id: stream.id,
            tracks: stream.getTracks().map((t) => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
                muted: t.muted,
            })),
        });

        const videoElement = videoRef.current;
        const audioElement = audioRef.current;

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoElement && videoTrack) {
            console.log("Setting up video track:", {
                enabled: videoTrack.enabled,
                readyState: videoTrack.readyState,
            });
            const videoStream = new MediaStream([videoTrack]);
            videoElement.srcObject = videoStream;
            videoElement
                .play()
                .then(() => console.log("Video playing successfully"))
                .catch((error) => console.error("Error playing video:", error));
        } else {
            console.log("Missing video element or track:", {
                hasElement: !!videoElement,
                hasTrack: !!videoTrack,
            });
        }

        // Thêm event listener để kiểm tra trạng thái video
        if (videoElement) {
            videoElement.onloadedmetadata = () => {
                console.log("Video metadata loaded");
            };
            videoElement.onplay = () => {
                console.log("Video started playing");
            };
            videoElement.onpause = () => {
                console.log("Video paused");
            };
            videoElement.onerror = (e) => {
                console.error("Video error:", e);
            };
        }

        return () => {
            if (videoElement) videoElement.srcObject = null;
            if (audioElement) audioElement.srcObject = null;
            console.log("Cleanup: removed stream from elements");
        };
    }, [stream]);

    return (
        <div className="relative rounded-lg overflow-hidden bg-gray-800">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className="w-full h-full object-cover"
            />
            <audio ref={audioRef} autoPlay muted={isLocal} />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                {isLocal ? "You" : `Participant ${stream.id}`}
            </div>
        </div>
    );
});

export default Consumer;
