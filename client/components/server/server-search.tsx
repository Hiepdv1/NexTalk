"use client";
import React, { useEffect, useState } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { DialogTitle } from "../ui/dialog";
import { Search } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface IServerSearchProps {
    data?: {
        label: string;
        type: "Channel" | "Member";
        values?: {
            icon: React.ReactNode;
            name: string;
            id: string;
        }[];
    }[];
}

const ServerSearch = ({ data }: IServerSearchProps) => {
    const [isOpenCommand, setIsOpenComamnd] = useState(false);
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        const keyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setIsOpenComamnd((open) => !open);
            }
        };

        document.addEventListener("keydown", keyDown);

        return () => document.removeEventListener("keydown", keyDown);
    }, []);

    const onClick = ({
        id,
        type,
    }: {
        type: "Channel" | "Member";
        id: string;
    }) => {
        setIsOpenComamnd(false);
        if (type === "Member") {
            return router.push(
                `/servers/${params?.serverId}/conversations/${id}`
            );
        }

        if (type === "Channel") {
            return router.push(`/servers/${params?.serverId}/channels/${id}`);
        }
    };

    return (
        <div>
            <button
                onClick={() => setIsOpenComamnd(true)}
                className="group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition"
            >
                <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <p className="font-semibold text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition">
                    Search
                </p>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
                    <span className="text-xs">⌘|⌃</span>K
                </kbd>
            </button>
            <CommandDialog
                open={isOpenCommand}
                onOpenChange={(open) => setIsOpenComamnd(open)}
            >
                <DialogTitle>
                    <CommandInput placeholder="Search all channels and members" />
                </DialogTitle>
                <CommandList>
                    <CommandEmpty>No Results found</CommandEmpty>
                    {data?.map(({ label, type, values }, index) => {
                        if (!values?.length) return null;
                        return (
                            <CommandGroup key={index} heading={label}>
                                {values.map(({ id, name, icon }, index) => {
                                    return (
                                        <CommandItem
                                            onSelect={() =>
                                                onClick({ id, type })
                                            }
                                            key={index}
                                        >
                                            {icon}
                                            <span>{name}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        );
                    })}
                </CommandList>
            </CommandDialog>
        </div>
    );
};

export default ServerSearch;
