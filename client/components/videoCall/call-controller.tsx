import React, { memo } from "react";
import { ActionTooltip } from "../action.tooltip";
import {
    CameraIcon,
    MicIcon,
    ScreenShareIcon,
    DoorOpenIcon,
    MicOffIcon,
    CameraOffIcon,
    ScreenShareOffIcon,
    Volume2Icon,
    ShareIcon,
    Monitor,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface CallControlsProps {
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    onToggleAudio: () => Promise<void>;
    onToggleVideo: () => Promise<void>;
    onShareScreen: (options: { isAudio: boolean; isScreen: boolean }) => void;
    onLeaveRoom: () => void;
    isScreenBroadcasting?: boolean;
}

const CallControls = ({
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    onToggleAudio,
    onToggleVideo,
    onShareScreen,
    onLeaveRoom,
    isScreenBroadcasting,
}: CallControlsProps) => {
    console.log("isScreenSharing: ", isScreenSharing);

    return (
        <div className="flex justify-center items-center">
            <ActionTooltip label={isAudioEnabled ? "Mute" : "Unmute"}>
                <button
                    onClick={onToggleAudio}
                    className={`mx-2 md:mx-4 w-12 h-12 ${
                        isAudioEnabled ? "bg-rose-500" : "bg-gray-600"
                    } rounded-full flex items-center justify-center`}
                >
                    {isAudioEnabled ? (
                        <MicIcon className="w-6 h-6" />
                    ) : (
                        <MicOffIcon className="w-6 h-6" />
                    )}
                </button>
            </ActionTooltip>

            <ActionTooltip label={isVideoEnabled ? "Camera off" : "Camera"}>
                <button
                    onClick={onToggleVideo}
                    className={`mx-2 md:mx-4 w-12 h-12 ${
                        isVideoEnabled ? "bg-rose-500" : "bg-gray-600"
                    } rounded-full flex items-center justify-center`}
                >
                    {isVideoEnabled ? (
                        <CameraIcon className="w-6 h-6" />
                    ) : (
                        <CameraOffIcon className="w-6 h-6" />
                    )}
                </button>
            </ActionTooltip>

            {isScreenBroadcasting && (
                <ActionTooltip
                    label={"This participant is currently sharing their screen"}
                >
                    <p className="text-white mx-4 md:w-56 h-12 bg-rose-500 rounded-md flex items-center justify-center px-2">
                        <Monitor className="w-6 h-6 mr-2" />
                        <span>Active</span>
                    </p>
                </ActionTooltip>
            )}

            {!isScreenBroadcasting && (
                <ActionTooltip
                    label={isScreenSharing ? "Stop sharing" : "Share screen"}
                >
                    {isScreenSharing ? (
                        <button
                            onClick={() =>
                                onShareScreen({
                                    isAudio: false,
                                    isScreen: false,
                                })
                            }
                            className="mx-2 p-3 md:p-0 md:mx-4 md:w-56 md:h-12 bg-rose-500 rounded-md flex items-center justify-center"
                        >
                            <ScreenShareIcon className="w-6 h-6 mr-2" />
                            Stop sharing
                        </button>
                    ) : (
                        <button className="p-3 md:p-0 mx-2 md:mx-4 md:w-56 md:h-12 bg-gray-600 rounded-md flex items-center justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div className="flex items-center">
                                        <ScreenShareOffIcon className="md:w-6 md:h-6 mr-2" />
                                        {window.innerWidth >= 900
                                            ? "Share screen"
                                            : "Share"}
                                    </div>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent className="md:w-56">
                                    <DropdownMenuItem
                                        onClick={() =>
                                            onShareScreen({
                                                isAudio: true,
                                                isScreen: true,
                                            })
                                        }
                                        className="cursor-pointer py-4 px-2 flex items-center justify-start"
                                    >
                                        <Volume2Icon className="w-4 h-4 mr-2" />
                                        Share Screen with Audio
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() =>
                                            onShareScreen({
                                                isAudio: false,
                                                isScreen: true,
                                            })
                                        }
                                        className="cursor-pointer py-4 px-2 flex items-center justify-start"
                                    >
                                        <ShareIcon className="w-4 h-4 mr-2" />
                                        Share Screen Only
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </button>
                    )}
                </ActionTooltip>
            )}

            <ActionTooltip label="Leave room">
                <button
                    onClick={onLeaveRoom}
                    className="mx-2 md:mx-4 w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center"
                >
                    <DoorOpenIcon className="w-6 h-6" />
                </button>
            </ActionTooltip>
        </div>
    );
};

export default memo(CallControls);
