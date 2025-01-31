"use client";
import InitialModal from "@/components/modals/initial-modal";
import { useRouter } from "next/navigation";
import { useData } from "@/components/providers/data-provider";
import { useEffect } from "react";
const setup = () => {
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

export default setup;
