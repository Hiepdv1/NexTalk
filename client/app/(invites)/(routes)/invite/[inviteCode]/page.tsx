"use client";

import { GetInviteCode, ReqeustAddMemberServer } from "@/API";
import Image from "next/image";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { IResponseServerData } from "@/interfaces";
import { notFound, redirect } from "next/navigation";
import SkeletonCard from "@/components/loadding/SkeletonCard";
import { Loader2 } from "lucide-react";

interface IInviteCodePageProps {
    params: {
        inviteCode: string;
    };
}

const InviteCodePage = ({ params }: IInviteCodePageProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAdded, setIsLoadingAdded] = useState(false);
    const [isFetched, setIsFetched] = useState(false);
    const [redirectPath, setRedirectPath] = useState<string | null>(null);
    const [serverData, setServerData] = useState<
        | { server: IResponseServerData; members: number; isMember: boolean }
        | undefined
    >();

    useEffect(() => {
        const fetchInviteCode = async () => {
            try {
                setIsFetched(true);
                setIsLoading(true);
                const res = await GetInviteCode(params.inviteCode);

                setServerData(res?.data);
            } catch (error) {
                console.error("Error fetching invite code:", error);
            }
        };

        fetchInviteCode().finally(() => {
            setIsFetched(false);
            setIsLoading(false);
        });
    }, []);

    const handleAddMemberServer = async () => {
        if (!serverData) return notFound();
        try {
            setIsLoadingAdded(true);
            if (serverData.isMember) {
                setRedirectPath(`/servers/${serverData.server.id}`);
                return;
            }
            const res = await ReqeustAddMemberServer(params.inviteCode);
            if (res?.data) {
                setRedirectPath(`/servers/${res.data.id}`);
            }
        } catch (err) {
            console.error("Error adding member to server:", err);
        } finally {
            setIsLoadingAdded(false);
        }
    };

    if (isLoading) return <SkeletonCard />;

    if (redirectPath) return redirect(redirectPath);

    if (!serverData && isFetched) return notFound();

    const server = serverData?.server;

    return (
        <div className="flex items-center justify-center h-screen select-none relative">
            {isLoadingAdded && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Loader2 className="dark:text-white text-[#36393E] animate-spin w-8 h-8" />
                </div>
            )}
            <Card
                className={`max-w-[516px] border-none w-full bg-[#36393E] ${
                    isLoadingAdded ? "opacity-65" : ""
                }`}
            >
                <CardHeader>
                    <CardTitle>
                        <div className="relative">
                            <div className="flex justify-center mb-3">
                                <div className="relative w-24 h-24">
                                    <Image
                                        fill
                                        alt={`Image/${server?.name}`}
                                        src={server?.imageUrl || ""}
                                        className="rounded-full"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <div className="mr-3 h-3 w-3 rounded-full bg-[#64B285]" />
                                <span>{server?.name}</span>
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center my-4">
                        <div className="mr-9 rounded-xl bg-[#303236] w-full max-w-40 p-1 flex items-center justify-center">
                            <div className="mr-3 h-3 w-3 rounded-full bg-[#64B285]" />
                            <span>0 Online</span>
                        </div>
                        <div className="rounded-xl bg-[#303236] w-full max-w-40 p-1 flex items-center justify-center">
                            <div className="mr-3 h-3 w-3 rounded-full bg-[#73767C]" />
                            <span>{serverData?.members} Members</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        disabled={isLoadingAdded}
                        onClick={handleAddMemberServer}
                        variant="primary"
                        className="w-full bg-[#768AD4] text-white text-base"
                    >
                        {serverData?.isMember ? "Joined" : "Join Server"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default InviteCodePage;
