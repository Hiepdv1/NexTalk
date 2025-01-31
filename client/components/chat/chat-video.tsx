import { memo } from "react";

interface IVideoChatProps {
    posterUrl: string;
    videoUrl: string;
}

const VideoChat = ({ videoUrl, posterUrl }: IVideoChatProps) => {
    const arrayPath = videoUrl?.split(".");
    arrayPath?.pop();

    return (
        <div className="w-96 h-full max-w-96 my-2 max-sm:w-full max-sm:h-full">
            <video key={videoUrl} poster={posterUrl} preload="none" controls>
                <source src={`${arrayPath?.join(".")}.mp4`} type="video/mp4" />
                <source
                    src={`${arrayPath?.join(".")}.webm`}
                    type="video/webm"
                />
                <source src={`${arrayPath?.join(".")}.ogg`} type="video/ogg" />
            </video>
        </div>
    );
};

export default memo(VideoChat);
