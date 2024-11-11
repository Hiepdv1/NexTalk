"use client";
import { maxSize } from "@/schema";
import { FileIcon, X } from "lucide-react";
import Link from "next/link";
import { memo, ReactNode } from "react";

interface IFileUploadProps {
    children: ReactNode;
    pathFile?: string | null;
    description?: string;
    onClose?: () => void;
}

const FileUpload = ({
    children,
    pathFile,
    description,
    onClose,
}: IFileUploadProps) => {
    if (pathFile) {
        return (
            <div className="relative flex items-center p-2 mt-2 rounded-md bg-background/10 ">
                <FileIcon className="w-10 h-10 fill-indigo-200 stroke-indigo-400" />
                <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href={pathFile || ""}
                    className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                >
                    {pathFile}
                </Link>
                <button
                    onClick={onClose}
                    type="button"
                    className="bg-rose-500 text-white p-1 rounded-full absolute top-0 right-0 shadow-sm"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-full">
            <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-100 dark:bg-slate-100 hover:bg-gray-300 dark:border-indigo-400/90 dark:hover:border-indigo-500/90 dark:hover:bg-slate-200"
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                        className="w-8 h-8 mb-4 text-gray-500 dark:text-indigo-500/90"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                    </svg>
                    <p className="text-lg mb-2 text-gray-500 dark:text-indigo-500/90">
                        <span className="font-semibold">
                            Click to upload or drag and drop
                        </span>
                    </p>
                    <p className="text-center text-base text-gray-500 dark:text-indigo-500/90 p-3 truncate overflow-hidden whitespace-nowrap text-ellipsis w-80">
                        {pathFile}
                    </p>
                    <p className="text-base text-gray-500 dark:text-indigo-500/90">
                        {description || "Image < 10Mb SVG, PNG, JPG or GIF"}
                    </p>
                </div>

                {children}
            </label>
        </div>
    );
};

export default memo(FileUpload);
