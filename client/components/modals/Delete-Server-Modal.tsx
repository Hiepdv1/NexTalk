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
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RequestDeleteServer, RequestGetFirstServer } from "@/API";
import qs from "query-string";
import { useSocket } from "../providers/socket-provider";
import { useData } from "../providers/data-provider";
interface IDeleteServerModalProps {}

const DeleteServerModal = (props: IDeleteServerModalProps) => {
    const router = useRouter();
    const { onOpen, isOpen, onClose, type, data } = useModal();
    const [isLoading, setIsLoading] = useState(false);
    const { servers } = useData();

    const { serverName, serverId } = data;
    const isModalOpen = isOpen && type === "DeleteServer";

    const onDeleteServer = async () => {
        try {
            setIsLoading(true);

            const otherServer = servers.filter((s) => s.id !== serverId);

            if (otherServer.length > 0) {
                router.push(
                    `/servers/${otherServer[0].id}/channels/${otherServer[0].channels[0].id}`
                );
            } else {
                router.push("/");
            }

            const res = await RequestDeleteServer(
                `/servers/${serverId}/delete`
            );

            if (res.statusCode !== 200) return;

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
                        Delete Server
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-center text-zinc-500">
                    Are you sure you want to proceed?
                    <br />
                    <span className="font-bold text-indigo-500">
                        {serverName}
                    </span>{" "}
                    <span className="font-semibold text-rose-600">
                        will be permanently deleted. This action cannot be
                        undone.
                        <br />
                        If you're sure, please confirm to delete this server.
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
                            onClick={() => onDeleteServer()}
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

export default DeleteServerModal;
