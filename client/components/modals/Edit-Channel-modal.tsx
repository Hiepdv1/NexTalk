"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Image from "next/image";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { ChannelSchema, ServerSchema } from "@/schema";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { RequestCreateChannel, RequestCreateServer } from "@/API";
import { useParams, useRouter } from "next/navigation";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { useAuth } from "@clerk/nextjs";
import { channelType } from "@/interfaces/server.interface";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import qs from "query-string";
import { PatchRequest } from "@/API/api";
import { useData } from "../providers/data-provider";

interface IEditChannelModalProps {}

const EditChannelModal = (props: IEditChannelModalProps) => {
    const params = useParams();

    const { handleUpdateChannel } = useData();
    const { isOpen, onClose, type, data } = useModal();
    const { channel } = data;

    const form = useForm<z.infer<typeof ChannelSchema>>({
        resolver: zodResolver(ChannelSchema),
        defaultValues: {
            name: undefined,
            type: channelType.TEXT,
        },
    });

    useEffect(() => {
        form.setValue("type", channel?.type || channelType.TEXT);
        form.setValue("name", channel?.name || "");
    }, [channel]);

    const isLoading = form.formState.isSubmitting;
    const router = useRouter();

    const isModalOpen = isOpen && type === "EditChannel";

    const handleOnsubmitForm = async (
        values: z.infer<typeof ChannelSchema>
    ) => {
        const url = qs.stringifyUrl({
            url: `/channels/${channel?.id}`,
            query: {
                serverId: params?.serverId,
            },
        });

        await PatchRequest(url, values);

        form.reset();
        onClose("EditChannel");
    };

    const handleModalClose = () => {
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
            <DialogContent className=" text-black border-0 p-0 overflow-hidden select-none">
                <LoadingForm isLoading={isLoading}>
                    <DialogHeader className="pt-8 px-6">
                        <DialogTitle className="text-2xl text-center font-bold">
                            Edit your channel
                        </DialogTitle>
                        <DialogDescription className="text-center text-zinc-500"></DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form
                            className="space-x-8 mt-8"
                            onSubmit={form.handleSubmit(handleOnsubmitForm)}
                        >
                            <div className="space-y-8 px-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel
                                                className="uppercase text-sm font-bold text-zinc-500
                                    dark:text-secondary/70"
                                            >
                                                Channel Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={isLoading}
                                                    className="bg-zinc-300/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    placeholder="Enter Channel Name"
                                                    {...form.register("name")}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                ></FormField>

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel
                                                className="uppercase text-sm font-bold text-zinc-500
                                    dark:text-secondary/70"
                                            >
                                                Channel Type
                                            </FormLabel>

                                            <Select
                                                disabled={isLoading}
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="bg-zinc-300/50 border-0 focus:ring-0 text-black ring-offset-0 focus:ring-offset-0 capitalize outline-none">
                                                        <SelectValue placeholder="Select a channel type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.values(
                                                        channelType
                                                    ).map((type) => {
                                                        return (
                                                            <SelectItem
                                                                value={type}
                                                                key={type}
                                                                className="capitalize"
                                                            >
                                                                {type.toLocaleUpperCase()}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                ></FormField>
                            </div>
                            <DialogFooter className="bg-gray-100 px-6 py-4">
                                <Button
                                    variant="secondary"
                                    disabled={isLoading}
                                >
                                    Create
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </LoadingForm>
            </DialogContent>
        </Dialog>
    );
};

export default EditChannelModal;
