import { channelType } from "@/interfaces/server.interface";
import * as z from "zod";

const kb = 1024 * 1024;
export const maxSize = 10;
const sendFileMaxSize = 1024;

export const ACCEPTED_IMAGE_TYPES = [
    "image/png",
    "image/jpg",
    "image/jpeg",
    "image/gif",
];

export const ChannelSchema = z.object({
    name: z
        .string()
        .min(1, {
            message: "Channel name is required",
        })
        .refine(
            (name) => {
                return name.toLowerCase() !== "general";
            },
            {
                message: "Channel name 'general' is not allowed",
            }
        ),
    type: z.nativeEnum(channelType),
});

export const ServerSchema = z.object({
    name: z.string().min(1, {
        message: "Server name is required",
    }),
    image: z
        .any()
        .refine(
            (value) => {
                console.log(value);
                const isFileList = value instanceof FileList;
                if (
                    !value ||
                    !isFileList ||
                    (isFileList && value.length === 0)
                ) {
                    return false;
                }
                return value as FileList;
            },
            { message: "Please upload a file." }
        )
        .refine(
            (files: FileList) => {
                if (!(files instanceof FileList)) {
                    return false;
                }

                return files[0].size < maxSize * kb;
            },
            {
                message: `File can't be bigger than ${maxSize}MB.`,
            }
        )
        .refine(
            (files) => {
                if (!(files instanceof FileList)) {
                    return false;
                }
                return ACCEPTED_IMAGE_TYPES.includes(files[0].type);
            },
            {
                message: `File format must be either ${ACCEPTED_IMAGE_TYPES.join(
                    ", "
                )}.`,
            }
        ),
});

export const ChatInputSchema = z.object({
    content: z.string().min(1, {
        message: "Content must be at least one character",
    }),
});

export const SendFileSchema = z.object({
    file: z
        .any()
        .refine(
            (value) => {
                console.log(value);
                const isFileList = value instanceof FileList;
                if (
                    !value ||
                    !isFileList ||
                    (isFileList && value.length === 0)
                ) {
                    return false;
                }
                return value as FileList;
            },
            { message: "Please upload a file." }
        )
        .refine(
            (files: FileList) => {
                if (!(files instanceof FileList)) {
                    return false;
                }

                return files[0]?.size < sendFileMaxSize * kb;
            },
            {
                message: `File can't be bigger than ${
                    sendFileMaxSize / 1024
                }GB`,
            }
        ),
});
