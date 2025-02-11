import React, { memo } from "react";
import { Users, X, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Profile } from "@/interfaces/message.interface";

interface IMember {
    id: string;
    participantId: string;
    profile: Profile;
    isLocal: boolean;
    isCamera: boolean;
    isMic: boolean;
}

interface IMemberListProps {
    consumers: IMember[];
    isOpen: boolean;
    onClose: any;
}

const MemberList = ({ consumers, isOpen, onClose }: IMemberListProps) => {
    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-end">
                    <Card className="w-80 h-screen mr-0 rounded-none dark:bg-zinc-900 bg-white">
                        <div className="p-4 border-b flex items-center justify-between dark:border-zinc-700">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                <h3 className="font-medium">
                                    Members ({[...consumers.values()].length})
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <ScrollArea className="h-[calc(100vh-64px)]">
                            <CardContent className="p-4">
                                {[...consumers.values()].map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 rounded-lg mb-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-12 h-12">
                                                <img
                                                    src={
                                                        member.profile
                                                            .imageUrl || ""
                                                    }
                                                    alt={member.profile.name}
                                                    className="rounded-full"
                                                />
                                                {member.isLocal && (
                                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-xs text-white px-1 rounded">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {member.profile.name}
                                                </p>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    {member.profile.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.isCamera ? (
                                                <Video className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <VideoOff className="w-4 h-4 text-red-500" />
                                            )}
                                            {member.isMic ? (
                                                <Mic className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <MicOff className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </ScrollArea>
                    </Card>
                </div>
            )}
        </>
    );
};

export default memo(MemberList);
