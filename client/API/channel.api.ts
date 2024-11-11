import {
    CreateMessageResponse,
    GetChannelAndMyselfResponse,
    ICreateChannel,
} from "@/interfaces";
import { appendFormData, GetRequest, PostRequest } from "./api";
import { AxiosProgressEvent, AxiosRequestConfig } from "axios";

export const RequestCreateChannel = async (
    url: string,
    data: ICreateChannel
) => {
    try {
        const res = await PostRequest(url, data);
        return res;
    } catch (error) {
        console.error(error);
    }
};

export const RequestChannelAndMySelt = async (
    url: string
): Promise<GetChannelAndMyselfResponse | undefined> => {
    try {
        const res = await GetRequest(url);
        return res?.data as GetChannelAndMyselfResponse;
    } catch (err) {
        console.log("Error getting channel and myself response: ", err);
    }
};

export const RequestUploadFileMessage = async (
    url: string,
    data: any,
    options?: AxiosRequestConfig,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
) => {
    try {
        const formData = appendFormData(data);
        const res = await PostRequest(url, formData, options, onProgress);
        return res;
    } catch (error) {
        console.error("Error: ", error);
    }
};
