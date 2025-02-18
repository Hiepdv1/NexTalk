"use client";

import { Plus } from "lucide-react";
import { ActionTooltip } from "../action.tooltip";
import { useModal } from "@/hooks/use-modal-store";
const NavigationAction = () => {
    const { onOpen } = useModal();

    return (
        <div>
            <ActionTooltip side="right" align="center" label="Add a Server">
                <button
                    onClick={() => onOpen("CreateServer")}
                    className="group flex items-center"
                >
                    <div
                        className="flex m-3 w-12 h-12 rounded-3xl group-hover:rounded-2xl
                    transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700
                    group-hover:bg-emerald-500 
                    "
                    >
                        <Plus
                            className="group-hover:text-white transition text-emerald-500"
                            size={25}
                        />
                    </div>
                </button>
            </ActionTooltip>
        </div>
    );
};

export default NavigationAction;
