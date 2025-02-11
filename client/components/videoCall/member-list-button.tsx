import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Profile } from "@/interfaces/message.interface";
import MemberList from "./member-list";

interface IMember {
    id: string;
    participantId: string;
    profile: Profile;
    isLocal: boolean;
    isCamera: boolean;
    isMic: boolean;
}

interface IMemberListButtonProps {
    consumers: IMember[];
}

const MemberListButton = ({ consumers }: IMemberListButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                className="rounded-full bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800  w-12 h-12"
                onClick={() => setIsOpen(true)}
            >
                <Users className="w-6 h-6" />
            </Button>

            <MemberList
                consumers={consumers}
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
};

export default MemberListButton;
