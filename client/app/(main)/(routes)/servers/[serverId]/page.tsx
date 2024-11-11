"use client";
import { Fragment, useEffect, useState } from "react";
import qs from "query-string";
import { GetServerDetails } from "@/API";
import { redirect, useRouter } from "next/navigation";
import { IResServerDetails } from "@/interfaces";
import { useData } from "@/components/providers/data-provider";

interface IServerDetailPageProps {
    params: {
        serverId: string;
    };
}

const ServerDetailPage = ({ params }: IServerDetailPageProps) => {
    const [data, setData] = useState<IResServerDetails>();
    const { servers } = useData();
    const router = useRouter();

    useEffect(() => {
        const server = servers.find((server) => server.id === params.serverId);

        return redirect(
            `/servers/${params.serverId}/channels/${server?.channels[0].id}`
        );
    }, [params.serverId, router]);

    return <Fragment />;
};

export default ServerDetailPage;
