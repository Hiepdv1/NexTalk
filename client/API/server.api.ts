import {
    ICreateServerData,
    IEditServerData,
    IResponseCreateServerData,
    IResponseServerData,
} from "@/interfaces";
import { AxiosRequestConfig } from "axios";
import {
    appendFormData,
    DeleteRequest,
    GetRequest,
    PatchRequest,
    PostRequest,
} from "./api";
import {
    IResGetChannelServer,
    IResServerDetails,
    MemberRole,
} from "@/interfaces/server.interface";

type ResFetchDataServer = {
    data: IResponseServerData;
    cancelRequest: (reason?: any) => void;
};

type ResFetchDataServerByInviteCode = {
    data: {
        server: IResponseServerData;
        members: number;
        isMember: boolean;
    };
    cancelRequest: (reason?: any) => void;
};

type ResFetchChannelData = {
    data: IResGetChannelServer;
    cancelRequest: (reason?: any) => void;
};

export const RequestCreateServer = async (
    data: Partial<ICreateServerData>,
    options?: AxiosRequestConfig
) => {
    try {
        const formData = appendFormData(data);
        const res = await PostRequest("/servers/create", formData, options);
        return res;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const RequestEditServer = async (
    data: IEditServerData,
    options?: AxiosRequestConfig
) => {
    try {
        const formData = appendFormData({
            name: data.name,
            image: data.image,
        });
        const res = await PatchRequest(
            `/servers/${data.serverId}`,
            formData,
            options
        );
        return res;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const RequestRoleChange = async (url: string, data: MemberRole) => {
    try {
        const res = await PatchRequest(url, { role: data });
        return res?.data;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const RequestLeaveServer = async (url: string) => {
    try {
        const res = await PatchRequest(url, {});
        return res?.data;
    } catch (error) {
        console.log("Error: ", error);
    }
};

export const RequestDeleteServer = async (url: string) => {
    try {
        const res = await DeleteRequest(url, {});
        return res?.data;
    } catch (error) {
        console.log("Error: ", error);
    }
};

export const RequestMemberKick = async (url: string) => {
    try {
        const res = await DeleteRequest(url, {});
        return res?.data;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const RequestGetFirstServer = async (
    options?: AxiosRequestConfig
): Promise<ResFetchDataServer | undefined> => {
    try {
        const res = await GetRequest("/servers/first-server", options);
        return res;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const GetAllServers = async (
    options?: AxiosRequestConfig
): Promise<
    | {
          data: IResponseServerData[];
          length: number;
          cancelRequest: (reason?: any) => void;
      }
    | undefined
> => {
    try {
        const res = await GetRequest("/servers", {});

        if (res) {
            const values = res?.data;

            return {
                data: values.data,
                length: values.length,
                cancelRequest: res.cancelRequest,
            };
        }
        return;
    } catch (error) {
        console.error("Error: ", error);
    }
};

export const GetServerById = async (
    serverId: string,
    options?: AxiosRequestConfig
): Promise<
    | {
          data: IResponseServerData;
          cancelRequest: (reason?: any) => void;
      }
    | undefined
> => {
    try {
        const res = await GetRequest(`/servers/${serverId}`, options);
        return res;
    } catch (err) {
        console.error("Error: ", err);
    }
};

export const GetServerChannels = async (
    serverId: string,
    options?: AxiosRequestConfig
): Promise<ResFetchChannelData | undefined> => {
    try {
        const res = await GetRequest(`/servers/channels/${serverId}`, options);
        return res;
    } catch (err) {
        console.error("Error: ", err);
    }
};

export const GetServerDetails = async (
    url: string
): Promise<IResServerDetails | undefined> => {
    try {
        const res = await GetRequest(url);
        return res?.data as IResServerDetails;
    } catch (err) {
        console.error("Error: ", err);
    }
};

export const RequestNewInviteCodeServer = async (
    serverId?: string,
    options?: AxiosRequestConfig
): Promise<ResFetchDataServer | undefined> => {
    try {
        const res = await PatchRequest(
            `/servers/${serverId}/invite-code`,
            {},
            options
        );
        return res;
    } catch (err) {
        console.error("Error: ", err);
    }
};

export const GetInviteCode = async (
    inviteCode: string,
    options?: AxiosRequestConfig
): Promise<ResFetchDataServerByInviteCode | undefined> => {
    try {
        const res = await GetRequest(`/servers/invite/${inviteCode}`, options);
        return res;
    } catch (err) {
        console.error("Error: ", err);
    }
};

export const ReqeustAddMemberServer = async (
    inviteCode: string,
    options?: AxiosRequestConfig
): Promise<ResFetchDataServer | undefined> => {
    try {
        const res = await PatchRequest(
            `/servers/join/${inviteCode}`,
            {},
            options
        );

        return res;
    } catch (err) {
        console.error("Error: ", err);
    }
};
