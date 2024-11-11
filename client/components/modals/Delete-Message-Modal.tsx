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

interface IDeleteMessageModalProps {}

const DeleteMessageModal = (props: IDeleteMessageModalProps) => {
    const { isOpen, onClose, type, data } = useModal();

    const { onDeleteMessage } = data;
    const isModalOpen = isOpen && type === "DeleteMessage";

    const onDelete = () => {
        if (!onDeleteMessage) return;
        onDeleteMessage();
        onClose();
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={() => onClose()}>
            <DialogContent
                className={`bg-white text-black border-0 p-0 overflow-hidden select-none `}
            >
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Delete Message
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-center text-zinc-500">
                    Are you sure you want to proceed?
                    <br />
                    <span className="font-semibold text-rose-600">
                        This action will be permanently deleted. This action
                        cannot be undone.
                        <br />
                        If you're sure, please confirm to delete this message.
                    </span>
                </DialogDescription>
                <DialogFooter className="bg-gray-100 px-6 py-4">
                    <div className="flex items-center justify-between w-full">
                        <Button onClick={() => onClose()} variant="ghost">
                            Cancel
                        </Button>
                        <Button onClick={onDelete} variant="primary">
                            Confirm
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteMessageModal;
