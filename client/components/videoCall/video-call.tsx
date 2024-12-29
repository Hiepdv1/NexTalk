import React, { memo, useEffect, useRef, useState } from "react";
import { useSocket } from "../providers/socket-provider";
import { useSocketEvents } from "../providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import CallControls from "./call-controller";
import { Profile } from "@/interfaces/message.interface";
import MediaStreamComponent from "./mediastream";
import { useData } from "../providers/data-provider";
import { useRouter } from "next/navigation";
import VideoScreenComponent from "./videoScreen";

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
}: IVideoCallProps) => {
    const { sendMessage, socket } = useSocket();
    const { addListener, removeListener } = useSocketEvents();
    const { servers } = useData();
    const router = useRouter();

    const [isVideoEnabling, setIsVideoEnabling] = useState<boolean>(false);
    const [isAudioEnabling, setIsAudioEnabling] = useState<boolean>(false);
    const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

    const videoStreamRef = useRef<MediaStream | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const shareStreamRef = useRef<MediaStream | null>(null);
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

    const handleJoinedRoom = (data: string) => {
        const { activeProducers } = JSON.parse(decrypt(data)) as {
            activeProducers: Array<{
                participantId: string;
                userId: string;
                profile: Profile;
            }>;
        };

        const listProducers = new Map<string, IStream>();

        activeProducers.forEach((producer) => {
            const newStreamProducer = {
                id: producer.profile.userId,
                participantId: producer.participantId,
                streams: [],
                profile: producer.profile,
                isLocal: socket.id === producer.participantId,
                isCamera: false,
                isMic: false,
            };

            listProducers.set(producer.participantId, newStreamProducer);
        });

        setConsumers((prev) => {
            const newMap = new Map([...prev, ...listProducers]);
            return newMap;
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

        if (isScreenSharing && consumerScreens) {
            consumerScreens.stream.getTracks().forEach((track) => track.stop());
            handleTurnOffScreenSharing();
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
        if (!consumerScreens) return;
        const infoPeer = peerConnections.current.get(socket.id as string);

        consumerScreens;

        consumerScreens.stream.getTracks().forEach((track) => track.stop());
        setConsumerScreens(null);

        const existingPeer = infoPeer?.find((peer) => peer.isLocal);

        if (existingPeer) {
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
            peerConnections.current.delete(socket.id as string);
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
                    shareStreamRef.current = null;

                    handleTurnOffScreenSharing();
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

    const handlePeerDisconnected = (message: string) => {
        const { participantId } = JSON.parse(decrypt(message)) as {
            participantId: string;
        };

        setConsumers((prev) => {
            prev.delete(participantId);

            const newMap = new Map(prev);

            return newMap;
        });

        setConsumerScreens(null);

        setIsScreenSharing(false);
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

    const setupListeners = () => {
        addListener("joined-room", handleJoinedRoom);
        addListener("new-member:info", handleNewMember);
        addListener("error", handleError);
        addListener("new-producer", handleNewProducer);
        addListener("peer-disconnected", handlePeerDisconnected);
        addListener("producer-disconnected", handleProducerDisconnected);
        addListener("updated-status-change", handleUpdatedMediaStreamStatus);

        return () => {
            removeListener("new-producer", handleNewProducer);
            removeListener("peer-disconnected", handlePeerDisconnected);
            removeListener("producer-disconnected", handleProducerDisconnected);
            removeListener("joined-room", handleJoinedRoom);
            removeListener("error", handleError);
            removeListener(
                "updated-status-change",
                handleUpdatedMediaStreamStatus
            );

            sendMessage("leave-room", { channelId: roomId }, "POST");
            stopMediaStream();
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
        <div className="flex-1 flex flex-col p-4">
            <div
                className={
                    isScreenSharing
                        ? "flex-1 grid grid-cols-[80%,20%] gap-x-2"
                        : "w-full h-full flex items-center justify-evenly flex-1 flex-wraps"
                }
            >
                {consumerScreens && (
                    <VideoScreenComponent consumerScreens={consumerScreens} />
                )}

                <div className="w-full h-full">
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

            <div className="fixed left-0 right-0 bottom-3 md:relative flex justify-center items-center my-4">
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
