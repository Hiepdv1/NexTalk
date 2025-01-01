import React, { memo, useEffect, useRef, useState } from "react";
import { useSocket } from "../providers/socket-provider";
import { useSocketEvents } from "../providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import CallControls from "./call-controller";
import { Profile } from "@/interfaces/message.interface";
import MediaStreamComponent from "./mediastream";
import { useRouter } from "next/navigation";
import VideoScreenComponent from "./videoScreen";
import { IServer } from "@/interfaces";

const SERVER_STUNS = [
    {
        urls: "stun:stun.l.google.com:19302",
    },
    {
        urls: "stun:stun.stunprotocol.org",
    },
];

interface IVideoCallProps {
    roomId: string;
    isAudioCall?: boolean;
    isVideoCall?: boolean;
    currentProfile: Profile;
    servers: IServer[];
}

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

const VideoCall = ({
    roomId,
    isAudioCall = true,
    isVideoCall = true,
    currentProfile,
    servers,
}: IVideoCallProps) => {
    const { sendMessage, socket } = useSocket();
    const { addListener, removeListener } = useSocketEvents();
    const router = useRouter();

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

    if (!sendMessage || !socket) return null;

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
                    iceServers: SERVER_STUNS,
                });

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
                            isLocal: currentProfile.userId === userId,
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
            { channelId: roomId, data },
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
                iceServers: SERVER_STUNS,
            });

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
                        isLocal: currentProfile.userId === userId,
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

            peer.oniceconnectionstatechange = () => {
                if (
                    peer.iceConnectionState === "disconnected" ||
                    peer.iceConnectionState === "failed"
                ) {
                    peer.close();
                    console.log("Peer consumer disconnected");
                }
            };

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
                channelId: roomId,
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

        console.log("Kind: ", kind);
        console.log("sdp: ", sdp);

        const desc = new RTCSessionDescription(sdp);
        peer.setRemoteDescription(desc).catch((e) =>
            console.error(`SetRemoteDescription Error: ${e}`)
        );
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

    const stopMediaStream = () => {
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
            });
        }

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => {
                track.stop();
                track.enabled = false;
            });
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
            return;
        }

        producer.peer.close();

        const filterPeer = peer.filter(
            (peerInfo) => peerInfo.producerId !== producerId
        );

        peerConnections.current.set(participantId, filterPeer);
    };

    const createPeer = (stream: MediaStream, type: string) => {
        const peer = new RTCPeerConnection({
            iceServers: SERVER_STUNS,
        });

        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        return new Promise<void>((resolve) => {
            peer.onnegotiationneeded = async () => {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                const message = new Promise<string>((resolve) => {
                    socket.once("created-producer", (data: string) => {
                        resolve(data);
                    });
                });

                sendMessage(
                    "create-producer",
                    {
                        channelId: roomId,
                        sdp: peer.localDescription,
                        type,
                    },
                    "POST"
                );

                const messageEncrypted = await message;
                const { sdp, kind, participantId, userId, producerId } =
                    JSON.parse(decrypt(messageEncrypted));

                const desc = new RTCSessionDescription(sdp);
                peer.setRemoteDescription(desc).catch((e) =>
                    console.error(`SetRemoteDescription Error: ${e}`)
                );

                const isExistingPeerConnection =
                    peerConnections.current.get(participantId);

                const newPeer = {
                    producerId,
                    peer,
                    isLocal: true,
                };

                if (isExistingPeerConnection) {
                    isExistingPeerConnection.push(newPeer);
                } else {
                    peerConnections.current.set(participantId, [newPeer]);
                }

                const videoTrack = stream.getVideoTracks();
                const settings = videoTrack[0]?.getSettings() as any;

                console.log("Settings: ", videoTrack[0]?.getSettings());

                if (
                    settings?.cursor === "motion" ||
                    settings?.cursor === "always"
                ) {
                    const screenSharing = {
                        id: userId,
                        participantId: socket.id as string,
                        isLocal: userId === currentProfile.userId,
                        stream,
                        producerId,
                        isScreenBroadcasting: socket.id !== participantId,
                    };

                    setConsumerScreens(screenSharing);
                } else {
                    setConsumers((prev) => {
                        const newMap = new Map(prev);

                        const existingConsumer = newMap.get(participantId);

                        console.log("Existing Consumer: ", existingConsumer);

                        if (existingConsumer) {
                            existingConsumer.streams = [
                                ...existingConsumer.streams,
                                stream,
                            ];
                            existingConsumer.isMic = type === "audio";
                            existingConsumer.isCamera = type === "video";
                            existingConsumer.isLocal = true;
                        } else {
                            throw new Error("Consumer not found");
                        }

                        console.log("Consumers updated");

                        return newMap;
                    });
                    resolve();
                }
            };
        });
    };

    const toggleAudio = async () => {
        if (audioStreamRef.current) {
            audioStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;

                sendMessage(
                    "media-status-change",
                    {
                        channelId: roomId,
                        participantId: socket.id,
                        isMic: !consumers.get(socket.id as string)?.isMic,
                        isCamera: false,
                    },
                    "POST"
                );

                setConsumers((prev) => {
                    const consumersMap = new Map(prev);

                    const currentConsumer = consumersMap.get(
                        socket.id as string
                    );

                    if (currentConsumer) {
                        currentConsumer.isMic = !currentConsumer.isMic;
                    }

                    return consumersMap;
                });
            });
            setIsAudioEnabling((prev) => !prev);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });
            audioStreamRef.current = stream;
            await createPeer(stream, "audio");
            setIsAudioEnabling(true);
            sendMessage(
                "media-status-change",
                {
                    channelId: roomId,
                    participantId: socket.id,
                    isMic: true,
                    isCamera: false,
                },
                "POST"
            );
        }
    };

    const toggleVideo = async () => {
        if (videoStreamRef.current) {
            videoStreamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;

                sendMessage(
                    "media-status-change",
                    {
                        channelId: roomId,
                        isCamera: !consumers.get(socket.id as string)?.isCamera,
                        isMic: false,
                    },
                    "POST"
                );

                setConsumers((prev) => {
                    const consumersMap = new Map(prev);

                    const currentConsumer = consumersMap.get(
                        socket.id as string
                    );

                    if (currentConsumer) {
                        currentConsumer.isCamera = track.enabled;
                    }

                    return consumersMap;
                });
            });
            setIsVideoEnabling((prev) => !prev);
        } else {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });
            await createPeer(stream, "video");
            videoStreamRef.current = stream;
            setIsVideoEnabling(true);
            sendMessage(
                "media-status-change",
                {
                    channelId: roomId,
                    isCamera: true,
                    isMic: false,
                },
                "POST"
            );
        }
    };

    const onLeaveRoom = () => {
        const server = servers[0];

        if (
            isScreenSharing &&
            consumerScreens &&
            socket.id === consumerScreens.participantId
        ) {
            consumerScreens.stream.getTracks().forEach((track) => track.stop());
            handleTurnOffScreenSharing();
        }

        const peers = peerConnections.current.get(socket.id as string);

        if (peers) {
            peers.forEach((peerInfo) => {
                if (peerInfo.peer.connectionState !== "closed") {
                    peerInfo.peer.close();
                }
            });
        }

        if (server) {
            const channel = server.channels[0];

            if (channel) {
                return router.push(
                    `/servers/${server.id}/channels/${channel.id}`
                );
            }

            return router.push(`/servers/${server.id}`);
        }

        return router.push("/");
    };

    const handleTurnOffScreenSharing = () => {
        const infoPeer = peerConnections.current.get(socket.id as string);

        consumerScreens?.stream.getTracks().forEach((track) => track.stop());
        setConsumerScreens(null);

        const existingPeer = infoPeer?.find((peer) => peer.isLocal);

        if (existingPeer && infoPeer) {
            existingPeer.peer.close();
            sendMessage(
                "peer-disconnected",
                {
                    channelId: roomId,
                    producerId: existingPeer.producerId,
                    type: "screen",
                },
                "POST"
            );
            peerConnections.current.set(
                socket.id as string,
                infoPeer?.filter(
                    (peerInfo) =>
                        peerInfo.producerId !== existingPeer.producerId
                )
            );
            console.log("PeerDisconnected");
        }

        setIsScreenSharing(false);
    };

    const toggleScreenSharing = async ({
        isAudio,
        isScreen,
    }: {
        isAudio: boolean;
        isScreen: boolean;
    }) => {
        if (isScreenSharing) {
            handleTurnOffScreenSharing();
        } else {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: isScreen,
                audio: isAudio,
            });

            setIsScreenSharing(true);

            stream.getTracks().forEach((track) => {
                track.onended = () => {
                    handleTurnOffScreenSharing();
                    shareStreamRef.current = null;

                    console.log("Ended");
                };
            });

            shareStreamRef.current = stream;
            await createPeer(stream, "screen");
        }
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

    const handlePeerDisconnectedLeaveRoom = (message: string) => {
        const { participantId } = JSON.parse(decrypt(message)) as {
            participantId: string;
        };

        console.log("Peer Leave Room disconnected: ", participantId);
        console.log(
            "ParticipantId Broadcast: ",
            consumerScreens?.participantId
        );

        if (consumerScreens?.participantId !== participantId) {
            disConnectPeer({
                participantId,
            });
            setIsScreenSharing(false);
            setConsumerScreens(null);
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

        console.log("Producer Disconnected Data: ", data);

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

        if (peerInfo?.peer.close()) {
            console.log("Peer disconnected: ", peerConnections);
        }

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

    const onTouchScreen = () => {
        if (controlBarRef.current?.classList.contains("hidden")) {
            if (timeout.current) {
                clearTimeout(timeout.current);
                console.log("Clear timeout");
            }

            if (controlBarRef.current) {
                controlBarRef.current.classList.remove("hidden");
                isScreenSharing &&
                    containerVideoRef.current?.classList.remove("hidden");

                timeout.current = setTimeout(() => {
                    controlBarRef.current?.classList.add("hidden");
                    isScreenSharing &&
                        containerVideoRef.current?.classList.add("hidden");
                }, 2000);
            }
            return;
        }

        controlBarRef.current?.classList.add("hidden");
        if (isScreenSharing) {
            containerVideoRef.current?.classList.add("hidden");
        }
    };

    const handleTouchBarControl = () => {
        if (timeout.current) {
            clearTimeout(timeout.current);
            console.log("Clear timeout touch bar");
        }
    };

    const setupListeners = () => {
        addListener("joined-room", handleJoinedRoom);
        addListener("new-member:info", handleNewMember);
        addListener("error", handleError);
        addListener("new-producer", handleNewProducer);
        addListener("leave-room-disconnected", handlePeerDisconnectedLeaveRoom);
        addListener("producer-disconnected", handleProducerDisconnected);
        addListener("updated-status-change", handleUpdatedMediaStreamStatus);

        return () => {
            removeListener("new-producer", handleNewProducer);
            removeListener("producer-disconnected", handleProducerDisconnected);
            removeListener("joined-room", handleJoinedRoom);
            removeListener("error", handleError);
            removeListener(
                "updated-status-change",
                handleUpdatedMediaStreamStatus
            );

            stopMediaStream();
            sendMessage("leave-room", { channelId: roomId }, "POST");
        };
    };

    useEffect(() => {
        const cleanup = setupListeners();

        // initProducer({ isProducer: false });

        sendMessage("initialize-channel", { channelId: roomId }, "POST");

        return cleanup;
    }, []);

    console.log("Consumers: ", consumers);
    console.log("ConsumersScreen: ", consumerScreens);

    return (
        <div className={"flex-1 flex flex-col md:p-4"}>
            <div
                onTouchStart={onTouchScreen}
                className={
                    isScreenSharing
                        ? "relative flex-1 flex flex-col md:grid md:grid-cols-[80%,20%] gap-x-2"
                        : "w-full h-full flex items-center justify-evenly flex-1 flex-wraps"
                }
            >
                {consumerScreens && (
                    <VideoScreenComponent consumerScreens={consumerScreens} />
                )}

                <div
                    ref={containerVideoRef}
                    className={`w-full h-full md:relative md:block ${
                        isScreenSharing
                            ? "absolute top-0 right-0 z-50 w-1/3 h-1/3 md:w-full md:block"
                            : ""
                    }`}
                >
                    {[...consumers.values()].map((consumerInfo) => {
                        return (
                            <MediaStreamComponent
                                key={consumerInfo.id}
                                roomId={roomId}
                                streams={consumerInfo.streams}
                                profile={consumerInfo.profile}
                                isLocal={consumerInfo.isLocal}
                                isVideoEnabling={consumerInfo.isCamera}
                                isAudioEnabling={consumerInfo.isMic}
                                isScreenShare={isScreenSharing}
                            />
                        );
                    })}
                </div>
            </div>

            <div
                onTouchStart={handleTouchBarControl}
                ref={controlBarRef}
                className="hidden z-50 md:flex fixed left-0 right-0 bottom-3 md:relative justify-center items-center my-4"
            >
                <CallControls
                    isAudioEnabled={isAudioEnabling}
                    isVideoEnabled={isVideoEnabling}
                    isScreenSharing={isScreenSharing}
                    onShareScreen={toggleScreenSharing}
                    onToggleAudio={toggleAudio}
                    onToggleVideo={toggleVideo}
                    onLeaveRoom={onLeaveRoom}
                    isScreenBroadcasting={consumerScreens?.isScreenBroadcasting}
                />
            </div>
        </div>
    );
};

export default memo(VideoCall);
