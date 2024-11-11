import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "./avatar";

interface IUserAvatarProps {
    src: string;
    className: string;
}

const UserAvatar = ({ src, className }: IUserAvatarProps) => {
    return (
        <Avatar className={cn("w-7 h-7 md:h-10 md:w-10")}>
            <AvatarImage src={src} />
        </Avatar>
    );
};

export default UserAvatar;
