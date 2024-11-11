import { AxiosProgressEvent } from "axios";
import qs from "query-string";
import { RequestUploadFileMessage } from "@/API";

export const handleFileUpload = async ({
    values,
    user,
    sendMessage,
    type,
    channel,
    addPendingMessage,
    apiUrl,
    query,
    handleOnProgress,
    removePendingMessageByTimestamp,
}: {
    values: { file: File; pathFile: string };
    user: any;
    sendMessage: any;
    type: string;
    channel?: any;
    addPendingMessage: Function;
    apiUrl: string;
    query: Record<string, any>;
    handleOnProgress: Function;
    removePendingMessageByTimestamp: Function;
}) => {
    if (!user || !sendMessage) return;

    const file = values.file;
    const timestamp = Date.now();

    if (type === "conversation" && channel) {
        addPendingMessage({
            channelId: channel.id,
            message: file.name,
            name: `${user.firstName} ${user.lastName || ""}`,
            role: channel.role,
            timestamp,
            userId: user.id,
            userImage: user.imageUrl,
            fileUrl: values.pathFile,
        });
    }

    const url = qs.stringifyUrl({
        url: apiUrl || "",
        query,
    });

    const res = await RequestUploadFileMessage(
        url,
        { file },
        { headers: { "Content-Type": "multipart/form-data" } },
        (progressEvent: AxiosProgressEvent) => {
            handleOnProgress(timestamp, progressEvent, file.size);
        }
    );

    if (res?.data.statusCode == 200) {
        removePendingMessageByTimestamp(timestamp);
    }
};
