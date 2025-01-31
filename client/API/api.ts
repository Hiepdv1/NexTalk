import { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import api from "./axios";

export const GetRequest = async (url: string, options?: AxiosRequestConfig) => {
    try {
        const controller = new AbortController();
        const res = await api.get(url, {
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            ...options,
        });

        return {
            data: res.data,
            cancelRequest: controller.abort,
        };
    } catch (error) {
        console.error(error);
    }
};

export const DeleteRequest = async (
    url: string,
    data: any,
    options?: AxiosRequestConfig
) => {
    try {
        const controller = new AbortController();
        const res = await api.delete(url, {
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            data,
            ...options,
        });

        return {
            data: res.data,
            cancelRequest: controller.abort,
        };
    } catch (error) {
        console.error(error);
    }
};

export const PostRequest = async (
    url: string,
    data: any,
    options?: AxiosRequestConfig,
    onProgress?: (progressEvent: AxiosProgressEvent) => void
) => {
    try {
        const controller = new AbortController();
        const res = await api.post(url, data, {
            signal: controller.signal,
            ...options,
            onUploadProgress: onProgress,
        });

        return {
            data: res.data,
            cancelRequest: controller.abort,
        };
    } catch (error) {
        console.error(error);
    }
};

export const PatchRequest = async (
    url: string,
    data: any,
    options?: AxiosRequestConfig
) => {
    try {
        const controller = new AbortController();
        const res = await api.patch(url, data, {
            ...options,
            signal: controller.signal,
        });
        return {
            data: res.data,
            cancelRequest: controller.abort,
        };
    } catch (error) {
        console.error(error);
    }
};

export const appendFormData = (data: Record<string, any>) => {
    const formData = new FormData();

    const keys = Object.keys(data);
    for (const key of keys) {
        if (data.hasOwnProperty(key)) {
            const value = data[key];
            formData.append(key, value);
        }
    }

    return formData;
};
