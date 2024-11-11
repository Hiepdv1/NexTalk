import { ActionTooltip } from "@/components/action.tooltip";
import React from "react";

interface IDotWavePulse {
    color: "green" | "red" | "yellow";
    size: "medium" | "small" | "large";
    label: string;
}

export default function DotWavePulse({ color, size, label }: IDotWavePulse) {
    const colorClass =
        color === "green"
            ? "bg-green-500"
            : color === "red"
            ? "bg-red-500"
            : "bg-yellow-500";

    const waveColor1 =
        color === "green"
            ? "bg-green-400"
            : color === "red"
            ? "bg-red-400"
            : "bg-yellow-400";

    const waveColor2 =
        color === "green"
            ? "bg-green-300"
            : color === "red"
            ? "bg-red-300"
            : "bg-yellow-300";

    const waveColor3 =
        color === "green"
            ? "bg-green-200"
            : color === "red"
            ? "bg-red-200"
            : "bg-yellow-200";

    const sizes = {
        small: "w-2 h-2",
        medium: "w-2 h-2 sm:w-[12px] sm:h-[12px]",
        large: "w-2 h-2 sm:w-6 sm:h-6",
    };

    const sizePulse = {
        small: "w-4 h-4",
        medium: "w-6 h-6 sm:w-6 sm:h-6",
        large: "w-6 h-6 sm:w-8 sm:h-8",
    };

    const circleSize = sizes[size] || sizes.medium;
    const pulseSize = sizePulse[size] || sizePulse.medium;

    return (
        <ActionTooltip label={label} side="left">
            <div className="absolute flex items-center justify-center">
                <div
                    className={`absolute ${circleSize} ${colorClass} rounded-full z-10`}
                ></div>

                <div
                    className={`absolute ${pulseSize} ${waveColor1} ${sizePulse[size]} rounded-full opacity-75 animate-wave scale-[3]`}
                ></div>
                <div
                    className={`absolute ${pulseSize} ${waveColor2} ${sizePulse[size]} rounded-full opacity-50 animate-wave delay-200 scale-[3]`}
                ></div>
                <div
                    className={`absolute ${pulseSize} ${waveColor3} ${sizePulse[size]} rounded-full opacity-25 animate-wave delay-400 scale-[3]`}
                ></div>

                <div
                    className={`absolute ${pulseSize} ${waveColor3} ${sizePulse[size]} rounded-full opacity-20 animate-wave delay-500 scale-[3]`}
                ></div>
            </div>
        </ActionTooltip>
    );
}
