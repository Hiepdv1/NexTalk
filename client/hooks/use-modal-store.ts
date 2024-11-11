import { channelType, IChannel, IMember } from "@/interfaces/server.interface";
import { AxiosProgressEvent } from "axios";
import { create } from "zustand";

export type ModalType =
    | "CreateServer"
    | "Invite"
    | "EditServer"
    | "Members"
    | "CreateChannel"
    | "LeaveServer"
    | "DeleteServer"
    | "DeleteChannel"
    | "EditChannel"
    | "MessageFile"
    | "DeleteMessage";

type ModalData = Partial<{
    inviteCode: string;
    serverId: string;
    serverName: string;
    imageUrl: string;
    members: IMember[];
    profileId: string;
    channelType?: channelType;
    channel: IChannel;
    file: File;
    query: Record<string, any>;
    apiUrl: string;
    onDeleteMessage: () => void;
    onUploadFile: (data: any) => void;
}>;

interface ModalStore {
    modalClosed?: ModalType;
    type: ModalType | null;
    isOpen: boolean;
    data: ModalData;
    onOpen: (type: ModalType, data?: ModalData) => void;
    onClose: (modalClosed?: ModalType) => void;
}

export const useModal = create<ModalStore>((set) => ({
    type: null,
    data: {},
    isOpen: false,
    onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
    onClose: (modalClosed?: ModalType) =>
        set({ isOpen: false, type: null, modalClosed }),
}));
