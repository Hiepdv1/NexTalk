"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { RequestGetFirstServer } from "@/API";
import InitialModal from "@/components/modals/initial-modal";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/components/providers/data-provider";

const SetupPage = () => {
    const { profile, servers } = useData();
    const router = useRouter();

    const server = servers[0];

    useEffect(() => {
        if (server) {
            router.push(`/servers/${server.id}`);
        }
    }, [servers]);

    return <InitialModal userId={profile?.userId} />;
};

export default SetupPage;
