import {
    Conversation,
    GetOrCreateConversationResponse,
} from "@/interfaces/conversation.interface";
import { PostRequest } from "./api";

export const RequestGetConversation = async (url: string, data: any) => {
    try {
        const res = await PostRequest(url, data);
        return res?.data as Conversation;
    } catch (err) {
        console.log("RequestGetConversation error: " + err);
    }
};
