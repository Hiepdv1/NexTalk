"use client";

import React from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/tooltip";

interface ActionTooltipProps {
    label: string;
    children: React.ReactElement | null;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
}

export const ActionTooltip = React.memo(
    ({ label, children, align, side }: ActionTooltipProps) => {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>{children}</TooltipTrigger>
                    <TooltipContent side={side} align={align}>
                        <p className="font-semibold text-sm capitalize">
                            {label.toLowerCase()}
                        </p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
);
