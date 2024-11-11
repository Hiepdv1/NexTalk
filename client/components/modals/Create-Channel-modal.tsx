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
import { ChannelSchema } from "@/schema";
import { useEffect } from "react";
import { RequestCreateChannel } from "@/API";
import { useParams, useRouter } from "next/navigation";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { channelType } from "@/interfaces/server.interface";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import qs from "query-string";
import { useSocket } from "../providers/socket-provider";

interface ICreateChannelModalProps {
    userId: string;
}

const CreateChannelModal = (props: ICreateChannelModalProps) => {
    const params = useParams();

    const { isOpen, onClose, type, data } = useModal();
    const { sendMessage } = useSocket();

    const form = useForm<z.infer<typeof ChannelSchema>>({
        resolver: zodResolver(ChannelSchema),
        defaultValues: {
            name: undefined,
            type: channelType.TEXT,
        },
    });

    useEffect(() => {
        if (data.channelType) {
            form.setValue("type", data.channelType);
        }
    }, [data.channelType]);

    const isLoading = form.formState.isSubmitting;
    const router = useRouter();

    const isModalOpen = isOpen && type === "CreateChannel";

    const handleOnsubmitForm = async (
        values: z.infer<typeof ChannelSchema>
    ) => {
        if (!sendMessage) return;

        const url = qs.stringifyUrl({
            url: "/channels/create",
            query: {
                serverId: params?.serverId,
            },
        });

        const res = await RequestCreateChannel(url, values);

        const isSuccessful = res?.data.statusCode === 200;

        if (!isSuccessful) return;

        form.reset();
        onClose();
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
                            Create your channel
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

export default CreateChannelModal;
