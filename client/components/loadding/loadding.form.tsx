"use client";

import { ReactNode } from "react";

interface ILoadingFormProps {
    children: ReactNode;
    isLoading: Boolean;
}

const LoadingForm = (props: ILoadingFormProps) => {
    const { children, isLoading } = props;

    const cl =
        "relative rounded-[8px] flex items-center justify-center before:contents-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-blue-500 before:to-slate-600 before:animate-spin";

    return (
        <div
            className={`
            ${
                isLoading
                    ? cl
                    : "relative rounded-[8px] flex items-center justify-center before:contents-[''] before:absolute"
            }
        `}
        >
            <div className="relative z-20 bg-white m-1 rounded-[8px] overflow-hidden w-full">
                <div className={`${isLoading ? "opacity-50" : ""}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default LoadingForm;
