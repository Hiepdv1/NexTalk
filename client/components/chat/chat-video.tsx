import { memo } from "react";

interface IVideoChatProps {
    path?: string | null;
    posterUrl?: string;
}

const VideoChat = ({ path, posterUrl }: IVideoChatProps) => {
    const arrayPath = path?.split(".");
    arrayPath?.pop();

    return (
        <div className="w-96 h-full max-w-96 my-2 max-sm:w-full max-sm:h-full">
            <video poster={posterUrl} preload="none" controls>
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
