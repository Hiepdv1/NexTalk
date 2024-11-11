export interface IBaseChatProps {
    apiUrl: string;
    query: Record<string, any>;
    name: string;
    type: "conversation" | "channel";
}

export interface IChannel {
    id: string;
    name: string;
}

export interface IMember {
    role: string;
    userId: string;
}

export interface IChatInputProps extends IBaseChatProps {
    member: IMember;
    channel?: IChannel;
}

export interface IFileUploadValues {
    file: File;
    pathFile: string;
}
