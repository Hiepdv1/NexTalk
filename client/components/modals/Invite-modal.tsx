"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Check, Copy, RefreshCcw } from "lucide-react";
import { useOrigin } from "@/hooks/use-origin";
import { useRef, useState } from "react";
import { RequestNewInviteCodeServer } from "@/API";
import { useAuth } from "@clerk/nextjs";
interface IInviteModalProps {}

const InviteModal = (props: IInviteModalProps) => {
    const { onOpen, isOpen, onClose, type, data } = useModal();
    const idCopied = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const origin = useOrigin();

    const { inviteCode } = data;
    const inviteUrl = `${origin}/invite/${inviteCode}`;
    const isModalOpen = isOpen && type === "Invite";

    const onCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);

        if (!idCopied.current) {
            idCopied.current = setTimeout(() => {
                idCopied.current = null;
                setCopied(false);
            }, 1000);
        }
    };

    const onCreateNewInviteCode = async () => {
        try {
            setIsLoading(true);
            const res = await RequestNewInviteCodeServer(data.serverId);
            if (res?.data) {
                const { id, inviteCode } = res.data;
                onOpen("Invite", {
                    inviteCode: inviteCode,
                    serverId: id,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={() => onClose()}>
            <DialogContent className=" bg-white text-black border-0 p-0 overflow-hidden select-none">
                <DialogHeader className="pt-8 px-6">
                    <DialogTitle className="text-2xl text-center font-bold">
                        Invite Friends
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6">
                    <Label className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                        Server Invite Link
                    </Label>
                    <div className="flex items-center mt-2 gap-x-2">
                        <Input
                            disabled={isLoading}
                            value={inviteUrl}
                            className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                        />
                        <Button
                            disabled={isLoading}
                            onClick={onCopy}
                            size="icon"
                        >
                            {copied ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    <Button
                        onClick={onCreateNewInviteCode}
                        disabled={isLoading}
                        variant="link"
                        size="sm"
                        className="text-xs text-zinc-500 mt-4"
                    >
                        Generate a new link
                        <RefreshCcw className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InviteModal;
