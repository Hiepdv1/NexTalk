import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../providers/socket-provider";
import { useSocketEvents } from "../providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import CallControls from "./call-controller";
import { Profile } from "@/interfaces/message.interface";
import MediaStreamComponent from "./mediastream";
import { useRouter } from "next/navigation";
import VideoScreenComponent from "./videoScreen";
import { IServer } from "@/interfaces";
import { v4 as genuid } from "uuid";
import {
    ResICECandidateConsumer,
    ResICECandidateProducer,
} from "@/types/mediaStream.type";

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

const VideoCall = ({ roomId, currentProfile, servers }: IVideoCallProps) => {
    const { sendMessage, socket, StunServers: SERVER_STUNS } = useSocket();
    const { addListener, removeListener } = useSocketEvents();
    const router = useRouter();

    const PEER_CONFIG: RTCConfiguration = {
        iceServers: SERVER_STUNS?.current,
        iceTransportPolicy: "all",
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
    };

    const iceQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());

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
    )
        return null;

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

    const handleConnectionFailure = (
        peer: RTCPeerConnection,
        retryCount = 0
    ) => {
        const MAX_RETRIES = 3;

        if (retryCount >= MAX_RETRIES) {
            peer.close();
            return;
        }

        const restart = () => {
            try {
                peer.restartIce();
                console.log(`ICE restart attempt ${retryCount + 1}`);
            } catch (error) {
                handleConnectionFailure(peer, retryCount + 1);
            }
        };

        setTimeout(restart, 2000 * Math.pow(2, retryCount));
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

            const peer = new RTCPeerConnection(PEER_CONFIG);

            const consumerId = genuid();

            const iceMessageQueue: RTCIceCandidate[] = [];

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    if (peer.remoteDescription) {
                        console.log("ICE candidate:", {
                            type: event.candidate.type,
                            protocol: event.candidate.protocol,
                            address: event.candidate.address,
                            port: event.candidate.port,
                            foundation: event.candidate.foundation,
                        });
                        sendMessage(
                            "ice-candidate-consumer",
                            {
                                roomId,
                                candidate: event.candidate,
                                consumerId,
                            },
                            "POST"
                        );
                    } else {
                        iceMessageQueue.push(event.candidate);
                    }
                } else {
                    console.log("ICE gathering completed");
                }
            };

            peer.onconnectionstatechange = () => {
                console.log(
                    `Connection state changed: ${peer.connectionState}`
                );
                if (
                    peer.connectionState === "failed" ||
                    peer.connectionState === "disconnected"
                ) {
                    handleConnectionFailure(peer);
                }
            };

            peer.oniceconnectionstatechange = () => {
                if (peer.iceConnectionState === "failed") {
                    peer.restartIce();
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

            kind.split("/").forEach((k) => {
                console.log("Kind: ", k);
                peer.addTransceiver(k, { direction: "recvonly" });
            });

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

            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            return {
                peer,
                sdp: peer.localDescription,
                participantId,
                producerId,
                userId,
                consumerId,
                iceMessageQueue,
            };
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
                consumerId: infoPeer.consumerId,
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

        for (const peerInfo of listInfoPeers) {
            const consumer = decryptMessage.find(
                (p) => p.consumerId === peerInfo.consumerId
            );

            if (consumer) {
                const desc = new RTCSessionDescription(consumer.sdp);
                await peerInfo.peer.setRemoteDescription(desc);
                processIceQueue(peerInfo.consumerId, peerInfo.peer);
                if (peerInfo.iceMessageQueue.length > 0) {
                    sendMessage(
                        "ice-candidate-consumer",
                        {
                            roomId,
                            candidate: peerInfo.iceMessageQueue,
                            consumerId: peerInfo.consumerId,
                        },
                        "POST"
                    );
                }
            } else {
                console.error("Peer not found");
            }
        }
    };

    const handelCreateConsumerForProducer = async ({
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
        const peer = new RTCPeerConnection(PEER_CONFIG);

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

        const consumerId = genuid();

        const iceMessageQueue: RTCIceCandidate[] = [];

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                if (peer.remoteDescription) {
                    console.log("ICE candidate:", {
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address,
                        port: event.candidate.port,
                        foundation: event.candidate.foundation,
                    });
                    sendMessage(
                        "ice-candidate-consumer",
                        {
                            roomId,
                            candidate: event.candidate,
                            consumerId,
                        },
                        "POST"
                    );
                } else {
                    iceMessageQueue.push(event.candidate);
                }
            } else {
                console.log("ICE gathering completed");
            }
        };

        peer.onconnectionstatechange = () => {
            console.log(`Connection state changed: ${peer.connectionState}`);
            if (
                peer.connectionState === "failed" ||
                peer.connectionState === "disconnected"
            ) {
                handleConnectionFailure(peer);
            }
        };

        peer.oniceconnectionstatechange = () => {
            if (peer.iceConnectionState === "failed") {
                peer.restartIce();
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
                    isLocal: currentProfile.userId === userId,
                    participantId,
                    stream: combinedStream,
                    producerId,
                    isScreenBroadcasting: socket.id !== participantId,
                };

                setConsumerScreens(screenSharing);
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

        kind.split("/").forEach((k) => {
            peer.addTransceiver(k, { direction: "recvonly" });
        });

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
                consumerId,
            },
            "POST"
        );

        const messageEncrypted = await message;
        const { sdp, kind: kindRecv } = JSON.parse(
            decrypt(messageEncrypted)
        ) as {
            sdp: any;
            kind: string;
            consumerId: string;
            producerId: string;
            participantId: string;
        };

        const desc = new RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);

        processIceQueue(consumerId, peer);
        if (iceMessageQueue.length > 0) {
            sendMessage(
                "ice-candidate-consumer",
                {
                    roomId,
                    candidate: iceMessageQueue,
                    consumerId,
                },
                "POST"
            );
        }
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

    const createPeer = async (stream: MediaStream, type: string) => {
        const peer = new RTCPeerConnection(PEER_CONFIG);
        const producerId = genuid();

        stream.getTracks().forEach((track) => {
            peer.addTrack(track, stream);
        });

        const iceMessageQueue: RTCIceCandidate[] = [];

        peer.onicecandidate = (event) => {
            console.log("ICE Connection State:", peer.iceConnectionState);
            if (event.candidate) {
                if (peer.remoteDescription) {
                    console.log("ICE candidate:", {
                        type: event.candidate.type,
                        protocol: event.candidate.protocol,
                        address: event.candidate.address,
                        port: event.candidate.port,
                        foundation: event.candidate.foundation,
                    });
                    console.log("Data Before send - RoomId: ", roomId);
                    console.log("Data Before send - producerId: ", producerId);
                    sendMessage(
                        "ice-candidate-producer",
                        {
                            roomId,
                            candidate: event.candidate,
                            producerId,
                        },
                        "POST"
                    );
                } else {
                    iceMessageQueue.push(event.candidate);
                }
            } else {
                console.log("ICE gathering completed");
            }
        };

        peer.onconnectionstatechange = () => {
            console.log(`Connection state changed: ${peer.connectionState}`);
            if (peer.connectionState === "failed") {
                handleConnectionFailure(peer);
            }
        };

        peer.oniceconnectionstatechange = () => {
            if (peer.iceConnectionState === "failed") {
                peer.restartIce();
            }
        };

        const isExistingPeerConnection = peerConnections.current.get(
            socket.id as string
        );

        const newPeer = {
            producerId,
            peer,
            isLocal: true,
        };

        if (isExistingPeerConnection) {
            isExistingPeerConnection.push(newPeer);
        } else {
            peerConnections.current.set(socket.id as string, [newPeer]);
        }

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const message = new Promise<string>((resolve) => {
            socket.once("created-producer", (data: string) => {
                resolve(data);
            });
        });

        console.log("Bottom");
        console.log("Data Before send - RoomId: ", roomId);
        console.log("Data Before send - producerId: ", producerId);
        sendMessage(
            "create-producer",
            {
                channelId: roomId,
                sdp: peer.localDescription,
                type,
                producerId,
            },
            "POST"
        );

        const messageEncrypted = await message;
        const { sdp, kind, participantId, userId } = JSON.parse(
            decrypt(messageEncrypted)
        );

        const desc = new RTCSessionDescription(sdp);
        await peer.setRemoteDescription(desc);

        processIceQueue(producerId, peer);
        if (iceMessageQueue.length > 0) {
            sendMessage(
                "ice-candidate-producer",
                {
                    roomId,
                    candidate: iceMessageQueue,
                    producerId,
                },
                "POST"
            );
        }

        const videoTrack = stream.getVideoTracks();
        const settings = videoTrack[0]?.getSettings() as any;
        if (settings?.cursor === "motion" || settings?.cursor === "always") {
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
        }
    };

    const toggleAudio = useCallback(async () => {
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
            stream.addEventListener("inactive", () => {
                audioStreamRef.current = null;
                console.log("Stream is inactive");
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
    }, [audioStreamRef.current, createPeer, roomId, socket.id]);

    const toggleVideo = useCallback(async () => {
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
            stream.addEventListener("inactive", () => {
                videoStreamRef.current = null;
                console.log("Stream is inactive");
            });
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
    }, [roomId, videoStreamRef.current, createPeer]);

    const onLeaveRoom = useCallback(() => {
        const server = servers[0];

        if (
            isScreenSharing &&
            consumerScreens &&
            socket.id === consumerScreens.participantId
        ) {
            console.log("Is Screen producer leave room");
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
    }, [servers]);

    const handleTurnOffScreenSharing = () => {
        const infoPeer = peerConnections.current.get(socket.id as string);

        consumerScreens?.stream.getTracks().forEach((track) => track.stop());
        setConsumerScreens(null);

        const existingPeer = infoPeer?.find((peer) => peer.isLocal);

        if (existingPeer && infoPeer) {
            closePeer(existingPeer.peer);
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

    const toggleScreenSharing = useCallback(
        async ({
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

                stream.addEventListener("inactive", () => {
                    handleTurnOffScreenSharing();
                    shareStreamRef.current = null;
                    console.log("Stream is inactive");
                });

                shareStreamRef.current = stream;
                await createPeer(stream, "screen");
            }
        },
        [createPeer, isScreenSharing, handleTurnOffScreenSharing]
    );

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

    const processIceQueue = (key: string, peer: RTCPeerConnection) => {
        const currentIceQueue = iceQueue.current.get(key);

        if (!currentIceQueue) return;

        console.log("Process IceQueue");

        for (const icecandidate of currentIceQueue) {
            const newIceCandidate = new RTCIceCandidate(icecandidate);
            peer.addIceCandidate(newIceCandidate);
        }

        console.log("Updated iceCandidate");
    };

    const handleIcecandidateProducer = (message: string) => {
        const decryptMessage = JSON.parse(
            decrypt(message)
        ) as ResICECandidateProducer;
        const peers = peerConnections.current.get(decryptMessage.target);

        if (!peers) {
            console.log("Peers not found in handleIcecandidateProducer");
            return;
        }

        const peerInfo = peers.find(
            (p) => p.producerId === decryptMessage.producerId
        );

        if (!peerInfo) {
            console.log("peerInfo not found in handleIcecandidateProducer");
            return;
        }

        if (!peerInfo.peer.remoteDescription) {
            const existingIceQueue = iceQueue.current.get(
                decryptMessage.producerId
            );
            if (existingIceQueue) {
                existingIceQueue.push(decryptMessage.candidate);
            } else {
                iceQueue.current.set(decryptMessage.producerId, [
                    decryptMessage.candidate,
                ]);
            }
            return;
        }

        const newIceCandidate = new RTCIceCandidate(decryptMessage.candidate);
        peerInfo.peer.addIceCandidate(newIceCandidate);
        console.log(`Updated Peer Producer: ${decryptMessage.producerId}`);
    };

    const handleIcecandidateConsumer = (message: string) => {
        const decryptMessage = JSON.parse(
            decrypt(message)
        ) as ResICECandidateConsumer;
        const peers = peerConnections.current.get(decryptMessage.target);

        if (!peers) return;

        const peerInfo = peers.find(
            (p) => p.producerId === decryptMessage.producerId
        );

        if (!peerInfo) return;

        if (!peerInfo.peer.remoteDescription) {
            const existingIceQueue = iceQueue.current.get(
                decryptMessage.consumerId
            );
            if (existingIceQueue) {
                existingIceQueue.push(decryptMessage.candidate);
            } else {
                iceQueue.current.set(decryptMessage.consumerId, [
                    decryptMessage.candidate,
                ]);
            }
            return;
        }
        const newIceCandidate = new RTCIceCandidate(decryptMessage.candidate);
        peerInfo.peer.addIceCandidate(newIceCandidate);
        console.log(`Updated Peer Consumer: ${decryptMessage.consumerId}`);
    };

    const handleRestartProducer = async (message: string) => {
        console.log("Start restarting producer...");
        const { producerId, type } = JSON.parse(decrypt(message)) as {
            producerId: string;
            type: string;
        };

        const listPeer = peerConnections.current.get(socket.id as string);

        if (!listPeer) throw new Error(`Could not connect to ${socket.id}`);

        const producer = listPeer.find(
            (peerInfo) => peerInfo.producerId === producerId
        );

        if (!producer)
            throw new Error(
                `Could not connect to ${socket.id} with producer ${producerId}`
            );
        const offer = await producer.peer.createOffer({ iceRestart: true });
        producer.peer.setLocalDescription(offer);

        sendMessage(
            "producer-restart-required",
            {
                channelId: roomId,
                type,
                sdp: producer.peer.localDescription,
                producerId,
            },
            "POST"
        );
    };

    const handleRestartConsumer = async (message: string) => {
        console.log("Start restarting consumer...");
        const { producerId, consumerId, senderId } = JSON.parse(
            decrypt(message)
        ) as {
            producerId: string;
            consumerId: string;
            senderId: string;
        };

        const listPeer = peerConnections.current.get(senderId);

        if (!listPeer) throw new Error(`Cannot connect to ${senderId}`);

        const producer = listPeer.find(
            (peerInfo) => peerInfo.producerId === producerId
        );

        if (!producer) throw new Error(`Cannot find producer ${producerId}`);

        const offer = await producer.peer.createOffer({ iceRestart: true });
        producer.peer.setLocalDescription(offer);

        sendMessage(
            "consumer-restart-required",
            {
                channelId: roomId,
                producerId,
                consumerId,
                participantId: senderId,
                sdp: producer.peer.localDescription,
            },
            "POST"
        );
    };

    const closePeer = (peer: RTCPeerConnection) => {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.close();
    };

    useEffect(() => {
        console.log("useEffect close all connections");
        return () => {
            peerConnections.current.forEach((peers) => {
                peers.forEach(({ peer }) => {
                    if (peer.connectionState !== "closed") {
                        peer.getTransceivers().forEach((transceiver) =>
                            transceiver.stop()
                        );
                        closePeer(peer);
                    }
                });
            });
            videoStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
            audioStreamRef.current
                ?.getTracks()
                .forEach((track) => track.stop());
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            peerConnections.current.forEach((peers) => {
                peers.forEach(({ peer }) => {
                    if (peer.iceConnectionState === "disconnected") {
                        handleConnectionFailure(peer);
                    }
                });
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const setupListeners = () => {
        addListener("joined-room", handleJoinedRoom);
        addListener("new-member:info", handleNewMember);
        addListener("error", handleError);
        addListener("new-producer", handleNewProducer);
        addListener("leave-room-disconnected", handlePeerDisconnectedLeaveRoom);
        addListener("producer-disconnected", handleProducerDisconnected);
        addListener("updated-status-change", handleUpdatedMediaStreamStatus);
        addListener("ice-candidate-producer", handleIcecandidateProducer);
        addListener("ice-candidate-consumer", handleIcecandidateConsumer);
        addListener("producer-ice-restart-required", handleRestartProducer);
        addListener("consumer-ice-restart-required", handleRestartConsumer);

        return () => {
            removeListener("new-producer", handleNewProducer);
            removeListener("producer-disconnected", handleProducerDisconnected);
            removeListener("joined-room", handleJoinedRoom);
            removeListener("error", handleError);
            removeListener(
                "updated-status-change",
                handleUpdatedMediaStreamStatus
            );
            removeListener(
                "ice-candidate-producer",
                handleIcecandidateProducer
            );
            removeListener(
                "ice-candidate-consumer",
                handleIcecandidateConsumer
            );
            removeListener(
                "producer-ice-restart-required",
                handleRestartProducer
            );
            removeListener(
                "consumer-ice-restart-required",
                handleRestartConsumer
            );
            sendMessage("leave-room", { channelId: roomId }, "POST");
        };
    };

    useEffect(() => {
        const cleanup = setupListeners();

        // initProducer({ isProducer: false });

        sendMessage("initialize-channel", { channelId: roomId }, "POST");

        return cleanup;
    }, []);

    return (
        <div className={"flex-1 flex flex-col md:p-4 overflow-hidden"}>
            <div
                onTouchStart={onTouchScreen}
                className={
                    isScreenSharing
                        ? "relative flex-1 flex flex-col md:grid md:grid-cols-[80%,20%] gap-x-2"
                        : "w-full h-full flex items-center justify-evenly flex-1 flex-wraps overflow-y-auto scrollbar-hide"
                }
            >
                {consumerScreens && (
                    <VideoScreenComponent consumerScreens={consumerScreens} />
                )}

                <div
                    ref={containerVideoRef}
                    className={`w-full h-full md:relative ${
                        isScreenSharing
                            ? "absolute top-0 right-0 z-50 w-1/3 h-[24.25%] md:w-full md:block"
                            : "md:flex md:flex-wrap justify-evenly gap-y-1"
                    }`}
                >
                    {isScreenSharing
                        ? [...consumers.values()]
                              .slice(0, 4)
                              .map((consumerInfo, index) => {
                                  return (
                                      <MediaStreamComponent
                                          className={`z-[${index}]`}
                                          key={consumerInfo.id}
                                          roomId={roomId}
                                          streams={consumerInfo.streams}
                                          profile={consumerInfo.profile}
                                          isLocal={consumerInfo.isLocal}
                                          isVideoEnabling={
                                              consumerInfo.isCamera
                                          }
                                          isAudioEnabling={consumerInfo.isMic}
                                          isScreenShare={isScreenSharing}
                                      />
                                  );
                              })
                        : [...consumers.values()].map((consumerInfo, index) => {
                              return (
                                  <MediaStreamComponent
                                      className={`z-[${index}]`}
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
