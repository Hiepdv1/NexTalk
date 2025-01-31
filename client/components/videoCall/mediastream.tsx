import { Profile } from "@/interfaces/message.interface";
import { MicIcon, MicOffIcon } from "lucide-react";
import Image from "next/image";
import { memo } from "react";

interface IMediaSteamComponentProps {
    roomId: string;
    streams: MediaStream[];
    profile: Profile;
    isLocal?: boolean;
    isVideoEnabling: boolean;
    isAudioEnabling: boolean;
    isScreenShare: boolean;
    className?: string;
}

const MediaStreamComponent = ({
    streams,
    isLocal = false,
    profile,
    isAudioEnabling,
    isVideoEnabling,
    isScreenShare,
    className,
}: IMediaSteamComponentProps) => {
    const handleStreamProduder = (stream: MediaStream) => {
        const videoTrack = stream.getVideoTracks();
        const audioTrack = stream.getAudioTracks();

        if (videoTrack.length > 0) {
            const videoStream = new MediaStream(videoTrack);

            return (
                <video
                    key={stream.id}
                    ref={(video) => {
                        if (video) {
                            video.srcObject = videoStream;
                        }
                    }}
                    autoPlay
                    playsInline
                    muted={true}
                    className="w-full h-full object-cover"
                />
            );
        } else if (audioTrack.length > 0 && !isLocal) {
            const audioStream = new MediaStream(audioTrack);

            return (
                <audio
                    autoPlay
                    playsInline
                    key={stream.id}
                    ref={(audio) => {
                        if (audio) {
                            audio.srcObject = audioStream;
                            audio.muted = false;
                            audio.volume = 1;
                            audio
                                .play()
                                .catch((e: unknown) =>
                                    console.error("Play Audio Errror: ", e)
                                );
                        }
                    }}
                    muted={isLocal}
                />
            );
        }

        return null;
    };

    return (
        <div
            className={`${
                isScreenShare
                    ? "absolute w-1/3 md:h-[24.6%] top-0 right-0 md:relative md:w-auto md:mb-1"
                    : "w-full h-1/2 sm:w-full sm:h-[415px] md:w-[33%] md:h-1/3 relative rounded-lg overflow-hidden"
            } ${className}`}
        >
            {streams.map((stream) => {
                return handleStreamProduder(stream);
            })}

            {!isVideoEnabling && (
                <div className="absolute top-0 left-0 right-0 bottom-0">
                    <div
                        className={`w-full h-full bg-slate-600 md:dark:bg-black flex items-center justify-center`}
                    >
                        <Image
                            src={profile.imageUrl}
                            alt="Avatar/User"
                            width={120}
                            height={120}
                            objectFit="cover"
                            className={`${
                                isScreenShare
                                    ? "w-16 h-16 rounded-full"
                                    : "rounded-full"
                            } `}
                        />
                    </div>
                </div>
            )}

            <div className="absolute z-50 bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                {isLocal ? "You" : profile.name}
            </div>

            <div className="absolute right-2 bottom-2 py-1 px-2">
                {isAudioEnabling ? (
                    <MicIcon className="w-4 h-4" />
                ) : (
                    <MicOffIcon className="w-4 h-4" />
                )}
            </div>
        </div>
    );
};

export default memo(MediaStreamComponent);
