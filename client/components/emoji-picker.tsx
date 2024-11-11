"use client";

import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";

interface IEmojiPickerProps {
    onChange: (value: string) => void;
}

const EmojiPicker = ({ onChange }: IEmojiPickerProps) => {
    const { resolvedTheme } = useTheme();

    return (
        <Popover>
            <PopoverTrigger>
                <Smile className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover::text-zinc-300 transition" />
            </PopoverTrigger>
            <PopoverContent
                side="right"
                sideOffset={40}
                className="bg-transparent border-none shadow-nonce drop-shadow-none mb-16"
            >
                <Picker
                    theme={resolvedTheme}
                    data={data}
                    onEmojiSelect={(emoji: any) => onChange(emoji.native)}
                />
            </PopoverContent>
        </Popover>
    );
};

export default EmojiPicker;
