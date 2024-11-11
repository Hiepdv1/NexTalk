"use client";

import { useSocket } from "@/components/providers/socket-provider";
import { Badge } from "@/components/ui/badge";
import DotWavePulse from "../server/wave/DotWavePulse";

export const SocketInditor = () => {
    const { isConnected } = useSocket();

    if (!isConnected) {
        return (
            <div className="mr-8 relative">
                <DotWavePulse
                    label="Has been disconnected"
                    color="red"
                    size="medium"
                />
            </div>
        );
    }

    return (
        // <Badge
        //     variant="outline"
        //     className="bg-emerald-600 text-white border-none "
        // >
        //     Live: Real-time updates
        // </Badge>
        <div className="mr-8 relative">
            <DotWavePulse
                label="Has been connected"
                color="green"
                size="medium"
            />
        </div>
    );
};
