import CryptoJS from "crypto-js";
import { v4 as genuid } from "uuid";

export const generateHmac = (message: string) => {
    let hash_generated;

    const secret = process.env.NEXT_PUBLIC_SHARED_SECRET_KEY;

    if (!secret) throw new Error("secret is available");

    if (process.env.NEXT_PUBLIC_ENCRYPTION_ALGORITHM === "sha256") {
        hash_generated = CryptoJS.HmacSHA256(message, secret).toString(
            CryptoJS.enc.Hex
        );
    } else if (process.env.NEXT_PUBLIC_ENCRYPTION_ALGORITHM === "sha512") {
        hash_generated = CryptoJS.HmacSHA512(message, secret).toString(
            CryptoJS.enc.Hex
        );
    } else {
        throw new Error("Unsupported encryption algorithm");
    }

    return hash_generated;
};

export const generateNonce = (bytes?: number) => {
    const randomBytes = CryptoJS.lib.WordArray.random(bytes || 32);
    return randomBytes.toString(CryptoJS.enc.Hex);
};

export const generateRequestId = () => {
    return genuid();
};

export const getClientIp = async () => {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
};
