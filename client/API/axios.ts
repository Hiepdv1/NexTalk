import {
    generateHmac,
    generateNonce,
    generateRequestId,
    getClientIp,
} from "@/utility/request-signature";
// import { cookies } from "next/headers";
import Axios from "axios";

const api = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
    withCredentials: true,
    headers: {
        "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        // Cookie: cookies().toString(),
    },
    timeout: 0,
});

const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
};

api.interceptors.request.use(
    async (config) => {
        const body = config.data || {};
        const url = config?.url;
        const nonce = generateNonce();
        const requestId = generateRequestId();
        const timestamp = new Date().getTime();
        const userAgent = navigator.userAgent;
        const clientIp = await getClientIp();

        const messageParams = {
            url,
            body,
            nonce,
            clientIp,
            timestamp,
            requestId,
            userAgent,
        };

        const message = JSON.stringify(messageParams);

        config.headers["x-signature"] = generateHmac(message);
        config.headers["x-forwarded-for"] = clientIp;
        config.headers["x-request-nonce"] = nonce;
        config.headers["x-timestamp"] = timestamp;
        config.headers["x-request-id"] = requestId;
        config.headers["x-client-id"] =
            process.env.NEXT_PUBLIC_SIGNATURE_CLIENT_ID;

        const token = getCookie("__session");
        if (token) {
            config.headers["Authorization"] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (res) => {
        res.headers["Cache-Control"] = "no-store";
        return res;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
