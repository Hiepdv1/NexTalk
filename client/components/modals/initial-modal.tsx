"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { CircleX } from "lucide-react";

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
import {
    ChangeEvent,
    memo,
    MutableRefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import FileUpload from "../file-upload";

import { DragEvent } from "react";
import { RequestCreateServer } from "@/API";
import { useRouter } from "next/navigation";
import LoadingForm from "../loadding/loadding.form";
import { useModal } from "@/hooks/use-modal-store";
import { useData } from "../providers/data-provider";

interface IInitialModalProps {
    userId?: string;
}

const InitialModal = (props: IInitialModalProps) => {
    const [preview, setPreview] = useState<{
        path: string | null;
        image: string | null;
    }>({
        path: null,
        image: null,
    });

    const { isOpen, type, onClose } = useModal();
    const { setServers } = useData();

    const inputFileRef: MutableRefObject<HTMLInputElement | null> =
        useRef(null);

    const isOpenModal = isOpen && type === "InitialModal";

    const form = useForm<z.infer<typeof ServerSchema>>({
        resolver: zodResolver(ServerSchema),
        defaultValues: {
            name: undefined,
            image: undefined,
        },
    });

    const isLoading = form.formState.isSubmitting;
    const router = useRouter();

    const handleDropFile = (event: DragEvent<HTMLInputElement>) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files;
        handleReadFile(droppedFile[0], droppedFile[0].name);
        handleSetValidationFile(droppedFile);
    };

    const handleOnsubmitForm = async (values: z.infer<typeof ServerSchema>) => {
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
        if (res && res.data) {
            setServers((prev) => [...prev, res.data]);

            form.reset();
            router.push(`/servers/${res.data.id}`);
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

    const handleRemovePreview = useCallback(() => {
        setPreview({
            path: null,
            image: null,
        });
        form.setValue("image", null);
    }, [form]);

    return (
        <Dialog open={isOpenModal}>
            <DialogContent className=" text-black border-0 p-0 overflow-hidden select-none">
                <LoadingForm isLoading={isLoading}>
                    <DialogHeader className="pt-8 px-6">
                        <DialogTitle className="text-2xl text-center font-bold relative">
                            <span>Customize you server</span>
                            <button
                                onClick={() => onClose("InitialModal")}
                                className="absolute -top-2 right-0"
                            >
                                <CircleX size={24} />
                            </button>
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
                                                        pathFile={
                                                            preview.path || ""
                                                        }
                                                        description=""
                                                        onClose={
                                                            handleRemovePreview
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

export default memo(InitialModal);
