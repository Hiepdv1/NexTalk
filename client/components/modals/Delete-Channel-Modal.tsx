"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { useModal } from "@/hooks/use-modal-store";
import { Button } from "../ui/button";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RequestDeleteServer } from "@/API";
import qs from "query-string";
import { DeleteRequest } from "@/API/api";
import { useData } from "../providers/data-provider";

interface IDeleteChannelModalProps {}

const DeleteChannelModal = (props: IDeleteChannelModalProps) => {
    const router = useRouter();
    const params = useParams();
    const { onOpen, isOpen, onClose, type, data } = useModal();
    const [isLoading, setIsLoading] = useState(false);
    const { servers } = useData();

    const { channel } = data;
    const isModalOpen = isOpen && type === "DeleteChannel";

    const onDeleteChannel = async () => {
        try {
            setIsLoading(true);

            const url = qs.stringifyUrl({
                url: `/channels/${channel?.id}/delete`,
                query: {
                    serverId: params?.serverId,
                },
            });

            const server = servers.find(
                (server) => server.id === params?.serverId
            );

            if (!server) return;

            const existing = server.channels.find((c) => c.id !== channel?.id);

            if (!existing) return;

            router.push(`/servers/${server.id}/channels/${existing.id}`);

            await DeleteRequest(url, {});

            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={() => onClose()}>
            {isLoading && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
                    <Loader2 className="text-indigo-600 w-8 h-8  animate-spin" />
                </div>
            )}
            <DialogContent
                className={`bg-white text-black border-0 p-0 overflow-hidden select-none ${
                    isLoading ? "opacity-85" : ""
                }`}
            >
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Delete Channel
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-center text-zinc-500">
                    Are you sure you want to proceed?
                    <br />
                    <span className="font-bold text-indigo-500">
                        {channel?.name}
                    </span>{" "}
                    <span className="font-semibold text-rose-600">
                        will be permanently deleted. This action cannot be
                        undone.
                        <br />
                        If you're sure, please confirm to delete this channel.
                    </span>
                </DialogDescription>
                <DialogFooter className="bg-gray-100 px-6 py-4">
                    <div className="flex items-center justify-between w-full">
                        <Button
                            onClick={() => onClose()}
                            disabled={isLoading}
                            variant="ghost"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => onDeleteChannel()}
                            disabled={isLoading}
                            variant="primary"
                        >
                            Confirm
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteChannelModal;
