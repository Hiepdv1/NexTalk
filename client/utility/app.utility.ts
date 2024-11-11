import CryptoJS from "crypto-js";

export const encrypt = (text: string) => {
    const key = process.env.NEXT_PUBLIC_HASH_MESSAGE_SECRET_KEY;

    if (!key) throw new Error("No key specified");

    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Hex.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    return `${iv.toString(CryptoJS.enc.Base64)}:${encrypted.ciphertext.toString(
        CryptoJS.enc.Base64
    )}`;
};

export const decrypt = (encryptedText: string) => {
    const key = process.env.NEXT_PUBLIC_HASH_MESSAGE_SECRET_KEY;
    if (!key) throw new Error("No key specified");

    const parts = encryptedText.split(":");
    if (parts.length !== 2) throw new Error("Invalid encrypted text format");

    const [ivBase64, encryptedDataBase64] = parts;

    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const encryptedData = CryptoJS.enc.Base64.parse(encryptedDataBase64);
    const keyParsed = CryptoJS.enc.Hex.parse(key);

    const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: encryptedData,
    });

    try {
        const decrypted = CryptoJS.AES.decrypt(cipherParams, keyParsed, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7,
        });

        const result = decrypted.toString(CryptoJS.enc.Utf8);

        if (!result) throw new Error("Decryption failed. Invalid key or data.");
        return result;
    } catch (error) {
        throw new Error(
            "Decryption process failed. Ensure your key and data are valid."
        );
    }
};
