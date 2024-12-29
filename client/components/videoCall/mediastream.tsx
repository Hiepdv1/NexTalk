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
}

const MediaStreamComponent = ({
    streams,
    isLocal = false,
    profile,
    isAudioEnabling,
    isVideoEnabling,
    isScreenShare,
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
                        console.log(video);
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

    console.log("Streams: ", streams);

    console.log("IsScreenStream: ", isScreenShare);

    return (
        <div
            className={`${
                isScreenShare
                    ? "w-full relative h-1/4"
                    : "sm:w-full sm:h-[415px] md:w-[480px] md:h-[320px] relative rounded-lg overflow-hidden"
            } mb-2`}
        >
            {streams.map((stream) => {
                console.log("Stream: ", stream);
                return handleStreamProduder(stream);
            })}

            {!isVideoEnabling && (
                <div className="absolute top-0 left-0 right-0 bottom-0">
                    <div className="w-full h-full bg-slate-600 dark:bg-black flex items-center justify-center">
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

// const areEqual = (
//     prevProps: IMediaSteamComponentProps,
//     nextProps: IMediaSteamComponentProps
// ) => {
//     if (prevProps.streams.length !== nextProps.streams.length) return false;

//     for (let i = 0; i < prevProps.streams.length; i++) {
//         if (prevProps.streams[i].id !== nextProps.streams[i].id) {
//             return false;
//         }
//     }

//     return (
//         prevProps.streams === nextProps.streams &&
//         prevProps.isLocal === nextProps.isLocal &&
//         prevProps.isAudioEnabling === nextProps.isAudioEnabling &&
//         prevProps.isVideoEnabling === nextProps.isVideoEnabling &&
//         prevProps.isScreenShare === nextProps.isScreenShare
//     );
// };

export default memo(MediaStreamComponent);
