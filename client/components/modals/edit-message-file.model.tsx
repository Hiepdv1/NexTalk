"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import { EditMessageFile, SendFileSchema } from "@/schema";
import { ChangeEvent, memo, MutableRefObject, useRef, useState } from "react";
import FileUpload from "../file-upload";

import { DragEvent } from "react";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { FileIcon } from "lucide-react";
interface IMessageFileModalProps {}

const EditMessageFileModal = (props: IMessageFileModalProps) => {
    const { isOpen, onOpen, onClose, type, data } = useModal();
    const [pathFile, setPathFile] = useState<string | null>(null);

    const { onUploadFile, currentMessageUrl, posterImageUrl, fileId } = data;

    const form = useForm<z.infer<typeof EditMessageFile>>({
        resolver: zodResolver(EditMessageFile),
        defaultValues: {
            files: null,
        },
    });

    const isLoading = form.formState.isSubmitting;

    const handleDropFile = (event: DragEvent<HTMLInputElement>) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files;
        handleSetValidationFile(droppedFile);
    };

    const isModalOpen = isOpen && type === "EditMessageFile";

    const handleOnsubmitForm = async (
        values: z.infer<typeof EditMessageFile>
    ) => {
        try {
            if (values && onUploadFile) {
                onUploadFile({
                    file: values.files[0],
                    pathFile,
                });
            }
            onClose();
            form.reset();
            setPathFile(null);
        } catch (err) {
            console.log("Error Upload file message : ", err);
        }
    };

    const handleChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
        handleSetValidationFile(e.currentTarget.files);
        setPathFile(e.target.value);
    };

    const handleOnClose = () => {
        form.reset();
        setPathFile(null);
    };

    const handleSetValidationFile = (files: FileList | null) => {
        if (files) {
            form.setValue("files", files, {
                shouldValidate: true,
            });
        } else {
            form.setError("files", { message: "Please upload a file." });
        }
    };

    return (
        <Dialog
            open={isModalOpen}
            onOpenChange={() => {
                handleOnClose();
                onClose();
            }}
        >
            <DialogContent className=" text-black border-0 p-0 overflow-hidden select-none">
                <LoadingForm isLoading={isLoading}>
                    <DialogHeader className="pt-8 px-6">
                        <DialogTitle className="text-2xl text-center font-bold">
                            Add an attachment
                        </DialogTitle>
                        <DialogDescription className="text-center text-zinc-500">
                            Send a file as a message
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form
                            className="space-x-8 mt-8"
                            onSubmit={form.handleSubmit(handleOnsubmitForm)}
                        >
                            <div className="space-y-8 px-6">
                                <div
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDropFile}
                                >
                                    <FormField
                                        control={form.control}
                                        name="files"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <FileUpload
                                                        pathFile={pathFile}
                                                        description="File < 1GB"
                                                        onClose={handleOnClose}
                                                    >
                                                        <Input
                                                            disabled={isLoading}
                                                            id="dropzone-file"
                                                            type="file"
                                                            className="hidden"
                                                            onChange={
                                                                handleChangeFile
                                                            }
                                                        />
                                                    </FileUpload>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                            <h3 className="my-2 uppercase font-bold text-zinc-500 dark:text-secondary/70 text-base">
                                Current
                            </h3>
                            <div
                                className="!mx-0 flex justify-center"
                            >
                                {posterImageUrl ? (
                                    <video
                                        className="w-96 h-56"
                                        src={currentMessageUrl}
                                        controls
                                        preload="none"
                                        poster={posterImageUrl}
                                    ></video>
                                ) : (
                                    <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10 ">
                                        <FileIcon className="w-10 h-10 fill-indigo-200 stroke-indigo-400" />
                                        <a
                                            target="_blank"
                                            href={currentMessageUrl || ""}
                                            className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                                            rel="noopener noreferrer"
                                        >
                                            {fileId?.split(":::").pop()}
                                        </a>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="bg-gray-100 px-6 py-4 !m-0">
                                <Button
                                    variant="secondary"
                                    disabled={isLoading}
                                >
                                    Edit
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </LoadingForm>
            </DialogContent>
        </Dialog>
    );
};

export default memo(EditMessageFileModal);
