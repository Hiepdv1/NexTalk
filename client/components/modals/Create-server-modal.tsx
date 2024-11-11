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
import { ACCEPTED_IMAGE_TYPES, ServerSchema } from "@/schema";
import { ChangeEvent, MutableRefObject, useRef, useState } from "react";
import FileUpload from "../file-upload";

import { DragEvent } from "react";
import { RequestCreateServer } from "@/API";
import { useRouter } from "next/navigation";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { useAuth } from "@clerk/nextjs";
import { useSocket } from "../providers/socket-provider";

interface ICreateServerModalProps {
    userId: string;
}

const CreateServerModal = (props: ICreateServerModalProps) => {
    const [preview, setPreview] = useState<{
        path: string | null;
        image: string | null;
    } | null>(null);

    const inputFileRef: MutableRefObject<HTMLInputElement | null> =
        useRef(null);

    const form = useForm<z.infer<typeof ServerSchema>>({
        resolver: zodResolver(ServerSchema),
        defaultValues: {
            name: undefined,
            image: undefined,
        },
    });

    const isLoading = form.formState.isSubmitting;
    const { isOpen, onClose, type } = useModal();
    const { sendMessage } = useSocket();
    const router = useRouter();

    const isModalOpen = isOpen && type === "CreateServer";

    const handleDropFile = (event: DragEvent<HTMLInputElement>) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files;
        handleReadFile(droppedFile[0], droppedFile[0].name);
        handleSetValidationFile(droppedFile);
    };

    const handleOnsubmitForm = async (values: z.infer<typeof ServerSchema>) => {
        if (!sendMessage) return;
        const { userId } = props;
        const res = await RequestCreateServer(
            {
                profileId: userId,
                name: values.name,
                image: values.image[0],
            },
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        const isSuccessful = res?.data?.statusCode === 200;

        if (isSuccessful) {
            form.reset();
            onClose();
            setPreview(null);
        }
    };

    const handleSetValidationFile = (files: FileList | null) => {
        if (files) {
            form.setValue("image", files, {
                shouldValidate: true,
            });
        } else {
            form.setError("image", { message: "Please upload a file." });
        }
    };

    const handleReadFile = (file: File | null, path: string | null) => {
        if (file && ACCEPTED_IMAGE_TYPES.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = () => {
                setPreview({
                    image: reader.result as string,
                    path: path || file.name,
                });
            };

            reader.readAsDataURL(file);
        } else {
            setPreview({
                path,
                image: null,
            });
        }
    };

    const handleChangeImages = (event: ChangeEvent<HTMLInputElement>) => {
        const files = inputFileRef.current && inputFileRef.current.files;
        const file = files && files[0];
        handleReadFile(file, event.target.value);
        handleSetValidationFile(files);
    };

    const handleModalClose = () => {
        form.reset();
        setPreview(null);
    };

    return (
        <Dialog
            open={isModalOpen}
            onOpenChange={() => {
                handleModalClose();
                onClose();
            }}
        >
            <DialogContent className=" text-black border-0 p-0 overflow-hidden select-none">
                <LoadingForm isLoading={isLoading}>
                    <DialogHeader className="pt-8 px-6">
                        <DialogTitle className="text-2xl text-center font-bold">
                            Customize you server
                        </DialogTitle>
                        <DialogDescription className="text-center text-zinc-500">
                            Give your server a personality with a name and an
                            image. You also can always change it then you
                            created
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form
                            className="space-x-8 mt-8"
                            onSubmit={form.handleSubmit(handleOnsubmitForm)}
                        >
                            <div className="space-y-8 px-6">
                                {preview && preview.image && (
                                    <>
                                        <FormLabel
                                            className="uppercase text-base font-bold text-zinc-500
                                dark:text-secondary/70"
                                        >
                                            Preview
                                        </FormLabel>
                                        <div className="w-100 flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 relative">
                                                <Image
                                                    className="rounded-full"
                                                    fill
                                                    src={preview.image}
                                                    alt="Upload"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDropFile}
                                >
                                    <FormField
                                        control={form.control}
                                        name="image"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <FileUpload
                                                        pathFile={preview?.path}
                                                        onClose={
                                                            handleModalClose
                                                        }
                                                    >
                                                        <Input
                                                            disabled={isLoading}
                                                            id="dropzone-file"
                                                            type="file"
                                                            className="hidden"
                                                            {...form.register(
                                                                "image",
                                                                {
                                                                    onChange:
                                                                        handleChangeImages,
                                                                }
                                                            )}
                                                            ref={inputFileRef}
                                                        />
                                                    </FileUpload>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel
                                                className="uppercase text-sm font-bold text-zinc-500
                                    dark:text-secondary/70"
                                            >
                                                Server Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    disabled={isLoading}
                                                    className="bg-zinc-300/50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                    placeholder="Enter Server Name"
                                                    {...form.register("name")}
                                                />
                                            </FormControl>
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

export default CreateServerModal;
