"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "./socket-provider";
import { useSocketEvents } from "./socket-event-provider";
import { Profile } from "@/interfaces/message.interface";
import { decrypt } from "@/utility/app.utility";
import { useData } from "./data-provider";
import { usePathname } from "next/navigation";

type CallContextType = {
    handleLeaveChannel: () => void;
    handleSetChannel: (data: { channelId: string; name: string }) => void;
};

interface IStream {
    id: string;
    participantId: string;
    streams: MediaStream[];
    profile: Profile;
    isLocal: boolean;
    isCamera: boolean;
    isMic: boolean;
}

interface IStreamScreen {
    id: string;
    participantId: string;
    stream: MediaStream;
    isLocal: boolean;
    producerId: string;
    isScreenBroadcasting: boolean;
}

interface IInfoChannel {
    name: string;
    id: string;
}

const CallContext = createContext<CallContextType | null>(null);

const CallProviderContent = ({ children }: { children: React.ReactNode }) => {
    const { sendMessage, socket, StunServers: SERVER_STUNS } = useSocket();

    const { profile: currentProfile } = useData();
    const { addListener, removeListener } = useSocketEvents();

    const [channel, setChannel] = useState<IInfoChannel | null>(null);
    const [isVideoEnabling, setIsVideoEnabling] = useState<boolean>(false);
    const [isAudioEnabling, setIsAudioEnabling] = useState<boolean>(false);
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

    const videoStreamRef = useRef<MediaStream | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const shareStreamRef = useRef<MediaStream | null>(null);
    const controlBarRef = useRef<HTMLDivElement | null>(null);
    const containerVideoRef = useRef<HTMLDivElement | null>(null);
    const timeout = useRef<NodeJS.Timeout | null>(null);
    const peerConnections = useRef<
        Map<
            string,
            Array<{
                peer: RTCPeerConnection;
                producerId: string;
                isLocal: boolean;
            }>
        >
    >(new Map());

    const [consumers, setConsumers] = useState<Map<string, IStream>>(new Map());
    const [consumerScreens, setConsumerScreens] =
        useState<IStreamScreen | null>(null);

    if (
        !sendMessage ||
        !socket ||
        !SERVER_STUNS?.current ||
        SERVER_STUNS.current.length === 0
    ) {
        return children;
    }

    const handleJoinedRoom = async (data: string) => {
        const { activeProducers } = JSON.parse(decrypt(data)) as {
            activeProducers: Array<{
                participantId: string;
                userId: string;
                profile: Profile;
                producers: Array<{
                    participantId: string;
                    type: string;
                    producerId: string;
                    userId: string;
                    kind: string;
                }>;
            }>;
        };

        const listProducers = new Map<string, IStream>();
        const broadcasts: Array<{
            participantId: string;
            producerId: string;
            userId: string;
            kind: string;
            type: string;
        }> = [];

        activeProducers.forEach((info) => {
            const newStreamProducer = {
                id: info.profile.userId,
                participantId: info.participantId,
                streams: [],
                profile: info.profile,
                isLocal: socket.id === info.participantId,
                isCamera: false,
                isMic: false,
                producers: info.producers,
            };

            info.producers.forEach((producer) => {
                broadcasts.push({
                    participantId: info.participantId,
                    producerId: producer.producerId,
                    type: producer.type,
                    userId: producer.userId,
                    kind: producer.kind,
                });
            });

            listProducers.set(info.participantId, newStreamProducer);
        });

        setConsumers((prev) => {
            const newMap = new Map([...prev, ...listProducers]);
            return newMap;
        });

        await handleFetchBroadcasts(broadcasts);
    };

    const handleFetchBroadcasts = async (
        producersActive: Array<{
            participantId: string;
            producerId: string;
            userId: string;
            type: string;
            kind: string;
        }>
    ) => {
        const createPeers = producersActive.map(async (info) => {
            const { participantId, producerId, type, userId, kind } = info;

            return new Promise<{
                peer: RTCPeerConnection;
                sdp: any;
                participantId: string;
                producerId: string;
                userId: string;
            }>((resolve) => {
                const peer = new RTCPeerConnection({
                    iceServers: SERVER_STUNS.current,
                });

                peer.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log("ICE candidate:", {
                            type: event.candidate.type,
                            protocol: event.candidate.protocol,
                            address: event.candidate.address,
                            port: event.candidate.port,
                            foundation: event.candidate.foundation,
                        });
                    } else {
                        console.log("ICE gathering completed");
                    }
                };

                peer.ontrack = (e: RTCTrackEvent) => {
                    const streams = e.streams;

                    if (type === "screen") {
                        const combinedStream = new MediaStream();

                        streams.forEach((stream) => {
                            stream.getTracks().forEach((track) => {
                                combinedStream.addTrack(track);
                            });
                        });

                        const screenSharing = {
                            id: userId,
                            isLocal: currentProfile?.userId === userId,
                            participantId,
                            stream: combinedStream,
                            producerId,
                            isScreenBroadcasting: socket.id !== participantId,
                        };

                        setConsumerScreens(screenSharing);
                        setIsScreenSharing(true);
                        console.log("setConsumerScreens Updated");
                    } else {
                        const combinedStream = new MediaStream();

                        streams.forEach((stream) => {
                            stream.getTracks().forEach((track) => {
                                combinedStream.addTrack(track);
                            });
                        });

                        setConsumers((prev) => {
                            const newMap = new Map(prev);

                            const existingMember = newMap.get(participantId);

                            if (existingMember) {
                                existingMember.streams = [
                                    ...existingMember.streams,
                                    combinedStream,
                                ];
                                existingMember.isMic = type === "audio";
                                existingMember.isCamera = type === "video";
                            }

                            return newMap;
                        });
                        console.log("Consumer updated");
                    }
                };

                peer.onnegotiationneeded = async () => {
                    const offer = await peer.createOffer();
                    await peer.setLocalDescription(offer);

                    resolve({
                        peer,
                        sdp: peer.localDescription,
                        participantId,
                        producerId,
                        userId,
                    });
                };

                const existingPeerParticipant =
                    peerConnections.current.get(participantId);

                const newPeer = {
                    isLocal: false,
                    peer,
                    producerId,
                };

                if (existingPeerParticipant) {
                    existingPeerParticipant.push(newPeer);
                } else {
                    peerConnections.current.set(participantId, [newPeer]);
                }

                kind.split("/").forEach((k) => {
                    console.log("Kind: ", k);
                    peer.addTransceiver(k, { direction: "recvonly" });
                });
            });
        });

        const listInfoPeers = await Promise.all(createPeers);

        const message = new Promise<string>((resolve) => {
            socket.once("broadcasts", (message) => {
                resolve(message);
            });
        });

        const data = listInfoPeers.map((infoPeer) => {
            return {
                participantId: infoPeer.participantId,
                producerId: infoPeer.producerId,
                sdp: infoPeer.sdp,
            };
        });

        sendMessage(
            "fetch-existing-producers",
            { channelId: channel?.id, data },
            "POST"
        );

        const messageRes = await message;

        const decryptMessage = JSON.parse(decrypt(messageRes)) as Array<{
            consumerId: string;
            kind: string;
            participantId: string;
            producerId: string;
            sdp: RTCSessionDescription;
        }>;

        listInfoPeers.forEach((peerInfo) => {
            const consumer = decryptMessage.find(
                (p) => p.participantId === peerInfo.participantId
            );

            if (consumer) {
                const desc = new RTCSessionDescription(consumer.sdp);
                peerInfo.peer
                    .setRemoteDescription(desc)
                    .catch((e: unknown) => console.log(e));

                consumer.kind.split("/").forEach((k) => {
                    peerInfo.peer.addTransceiver(k, { direction: "recvonly" });
                });
            } else {
                console.error("Peer not found");
            }
        });
    };

    const handleNewMember = (message: string) => {
        const { participantId, profile } = JSON.parse(decrypt(message)) as {
            profile: Profile;
            participantId: string;
        };

        const existingMember = consumers.get(profile.userId);

        if (!existingMember) {
            setConsumers((prev) => {
                const newMap = new Map(prev);

                newMap.set(participantId, {
                    id: profile.userId,
                    isLocal: false,
                    participantId,
                    profile,
                    streams: [],
                    isCamera: false,
                    isMic: false,
                });

                return newMap;
            });
        }
    };

    const handleError = (error: any) => {
        console.error("SocketError: ", error);
    };

    const handelCreateConsumerForProducer = ({
        participantId,
        userId,
        type,
        kind,
        producerId,
    }: {
        participantId: string;
        userId: string;
        type: string;
        kind: string;
        producerId: string;
    }) => {
        return new Promise<void>((resolve) => {
            const peer = new RTCPeerConnection({
                iceServers: SERVER_STUNS.current,
                iceTransportPolicy: "all",
                iceCandidatePoolSize: 10,
                bundlePolicy: "max-bundle",
            });

            peer.oniceconnectionstatechange = () => {
                console.log("ICE Connection State:", peer.iceConnectionState);

                if (peer.iceConnectionState === "disconnected") {
                    setTimeout(async () => {
                        if (peer.iceConnectionState === "disconnected") {
                            try {
                                const offer = await peer.createOffer({
                                    iceRestart: true,
                                });
                                await peer.setLocalDescription(offer);

                                sendMessage(
                                    "create-consumer-for-producer",
                                    {
                                        channelId: channel?.id,
                                        sdp: peer.localDescription,
                                        participantId,
                                        kind: type,
                                        producerId,
                                    },
                                    "POST"
                                );
                            } catch (err) {
                                console.error("ICE restart failed:", err);
                                peer.close();
                                console.log(
                                    "Peer consumer disconnected after retry"
                                );
                            }
                        }
                    }, 3000);
                }

                if (peer.iceConnectionState === "failed") {
                    peer.close();
                    console.log("Peer consumer disconnected due to failure");
                }
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("ICE candidate:", {
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address,
                        port: event.candidate.port,
                        foundation: event.candidate.foundation,
                    });
                } else {
                    console.log("ICE gathering completed");
                }
            };

            peer.ontrack = (e: RTCTrackEvent) => {
                const streams = e.streams;

                if (type === "screen") {
                    const combinedStream = new MediaStream();

                    streams.forEach((stream) => {
                        stream.getTracks().forEach((track) => {
                            combinedStream.addTrack(track);
                        });
                    });

                    const screenSharing = {
                        id: userId,
                        isLocal: currentProfile?.userId === userId,
                        participantId,
                        stream: combinedStream,
                        producerId,
                        isScreenBroadcasting: socket.id !== participantId,
                    };

                    setConsumerScreens(screenSharing);

                    resolve();
                } else {
                    const combinedStream = new MediaStream();

                    streams.forEach((stream) => {
                        stream.getTracks().forEach((track) => {
                            combinedStream.addTrack(track);
                        });
                    });

                    setConsumers((prev) => {
                        const newMap = new Map(prev);

                        const existingMember = newMap.get(participantId);

                        if (existingMember) {
                            existingMember.streams = [
                                ...existingMember.streams,
                                combinedStream,
                            ];
                            existingMember.isMic = type === "audio";
                            existingMember.isCamera = type === "video";
                        }

                        return newMap;
                    });
                    console.log("Consumer updated");
                    resolve();
                }
            };

            peer.onnegotiationneeded = () =>
                handleNegotiationNeededEvent(
                    peer,
                    kind,
                    participantId,
                    producerId
                );

            kind.split("/").forEach((k) => {
                console.log("Kind: ", k);
                peer.addTransceiver(k, { direction: "recvonly" });
            });

            const isExistingPeerConnection =
                peerConnections.current.get(participantId);

            const newPeer = {
                producerId,
                peer,
                isLocal: false,
            };

            if (isExistingPeerConnection) {
                isExistingPeerConnection.push(newPeer);
            } else {
                peerConnections.current.set(participantId, [newPeer]);
            }
        });
    };

    const handleNegotiationNeededEvent = async (
        peer: RTCPeerConnection,
        type: string,
        participantId: string,
        producerId: string
    ) => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const message = new Promise<string>((resolve) => {
            socket.once("consumer-connected", (data: string) => {
                resolve(data);
            });
        });

        sendMessage(
            "create-consumer-for-producer",
            {
                channelId: channel?.id,
                sdp: peer.localDescription,
                participantId,
                kind: type,
                producerId,
            },
            "POST"
        );

        const messageEncrypted = await message;
        const { sdp, kind } = JSON.parse(decrypt(messageEncrypted)) as {
            sdp: any;
            kind: string;
        };

        const desc = new RTCSessionDescription(sdp);
        peer.setRemoteDescription(desc).catch((e) =>
            console.error(`SetRemoteDescription Error: ${e}`)
        );
    };

    const handleNewProducer = async (messgae: string) => {
        const { kind, participantId, userId, type, producerId } = JSON.parse(
            decrypt(messgae)
        ) as {
            participantId: string;
            userId: string;
            kind: string;
            type: string;
            producerId: string;
        };

        await handelCreateConsumerForProducer({
            participantId,
            userId,
            type,
            kind,
            producerId,
        });

        if (type === "screen") {
            setIsScreenSharing(true);
        }
    };

    const disConnectPeer = ({
        participantId,
        producerId,
    }: {
        participantId: string;
        producerId?: string;
    }) => {
        const peer = peerConnections.current.get(participantId);

        if (!peer) {
            console.warn("Peer not found");
            return;
        }

        const producer = peer.find(
            (peerInfo) => peerInfo.producerId === producerId
        );

        if (!producer) {
            peer.forEach((peerInfo) => peerInfo.peer.close());
            peerConnections.current.delete(participantId);
            console.log("Producer clear peers");
            return;
        }

        producer.peer.close();

        const filterPeer = peer.filter(
            (peerInfo) => peerInfo.producerId !== producerId
        );

        peerConnections.current.set(participantId, filterPeer);
    };

    const handlePeerDisconnectedLeaveRoom = (message: string) => {
        const { participantId } = JSON.parse(decrypt(message)) as {
            participantId: string;
        };

        if (consumerScreens?.participantId === participantId) {
            consumerScreens?.stream
                .getTracks()
                .forEach((track) => track.stop());
            setIsScreenSharing(false);
            setConsumerScreens(null);
            console.log("Broadcast screen disconnected");
        }

        disConnectPeer({
            participantId,
        });
        setConsumers((prev) => {
            const newMap = new Map(prev);

            newMap.delete(participantId);

            return newMap;
        });
    };

    const handleProducerDisconnected = (message: string) => {
        const data = JSON.parse(decrypt(message)) as {
            participantProducerId: string;
            type: string;
            producerId: string;
        };

        if (data.type === "screen") {
            setConsumerScreens(null);
            setIsScreenSharing(false);
        } else {
            setConsumers((prev) => {
                const newMap = new Map(prev);

                newMap.delete(data.participantProducerId);

                return newMap;
            });
        }

        const producers =
            peerConnections.current.get(data.participantProducerId) || [];

        const peerInfo = producers.find(
            (p) => p.producerId === data.producerId
        );

        peerInfo?.peer.close();

        peerConnections.current.set(
            data.participantProducerId,
            producers.filter((p) => p.producerId !== data.producerId)
        );
    };

    const handleUpdatedMediaStreamStatus = (message: string) => {
        const { isCamera, isMic, participantId } = JSON.parse(
            decrypt(message)
        ) as { isCamera: boolean; isMic: boolean; participantId: string };

        setConsumers((prev) => {
            const newMap = new Map(prev);

            const consumer = newMap.get(participantId);

            if (consumer) {
                consumer.isCamera = isCamera;
                consumer.isMic = isMic;
            }

            return newMap;
        });
    };

    const handleSetChannel = ({
        channelId,
        name,
    }: {
        channelId: string;
        name: string;
    }) => {
        setChannel({ id: channelId, name: name });
    };

    const stopLocalStreamScreen = () => {
        if (shareStreamRef.current) {
            shareStreamRef.current.getTracks().forEach((track) => track.stop());
        }
    };

    const handleLeaveChannel = () => {
        stopLocalStreamScreen();
        sendMessage("leave-room", { channelId: channel?.id }, "POST");
        setChannel(null);
    };

    useEffect(() => {
        addListener("joined-room", handleJoinedRoom);
        addListener("new-member:info", handleNewMember);
        addListener("error", handleError);
        addListener("new-producer", handleNewProducer);
        addListener("leave-room-disconnected", handlePeerDisconnectedLeaveRoom);
        addListener("producer-disconnected", handleProducerDisconnected);
        addListener("updated-status-change", handleUpdatedMediaStreamStatus);
    }, []);

    return (
        <CallContext.Provider value={{ handleLeaveChannel, handleSetChannel }}>
            {children}
        </CallContext.Provider>
    );
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isAuthPage = pathname === "/sign-in" || pathname === "/sign-up";

    if (isAuthPage) {
        return children;
    }

    return <CallProviderContent>{children}</CallProviderContent>;
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error("useCall must be used within a CallProvider");
    }
    return context;
};
