import React, { memo, useEffect, useRef, useState } from "react";
import sdpTransform from "sdp-transform";
import { useSocket } from "../providers/socket-provider";
import { useSocketEvents } from "../providers/socket-event-provider";
import { decrypt } from "@/utility/app.utility";
import Consumer from "./consumer";
import mediasoup, { Device } from "mediasoup-client";

interface IVideoCallProps {
    roomId: string;
}

interface IStream {
    id: string;
    participantId: string;
    stream: MediaStream;
}

const VideoCall = ({ roomId }: IVideoCallProps) => {
    const { sendMessage, socket } = useSocket();
    const { addListener, removeListener } = useSocketEvents();

    const deviceRef = useRef<Device>();

    const [isVideoEnabling, setIsVideoEnabling] = useState<boolean>(true);
    const [isAudioEnabling, setIsAudioEnabling] = useState<boolean>(true);
    const [consumers, setConsumers] = useState<Map<string, IStream>>(new Map());

    if (!sendMessage || !socket) return null;

    const initProducer = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        createPeer(stream);
    };

    const createPeer = (stream: MediaStream) => {
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org",
                },
            ],
        });

        stream.getTracks().forEach((track) => {
            console.log("Track: ", track.kind);
            peer.addTrack(track, stream);
        });

        peer.onnegotiationneeded = () => {
            if (peer.signalingState !== "stable") return;
            handleNegotiationNeededEvent(peer, stream);
        };
    };

    const handleNegotiationNeededEvent = async (
        peer: RTCPeerConnection,
        stream: MediaStream
    ) => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const message = new Promise<string>((resolve) => {
            socket.once("producer-created", (data: string) => {
                resolve(data);
            });
        });

        sendMessage(
            "initializeChannel",
            {
                channelId: roomId,
                sdp: peer.localDescription,
            },
            "POST"
        );

        const messageEncrypted = await message;
        const { sdp, participantId, activeProducers } = JSON.parse(
            decrypt(messageEncrypted)
        );
        const desc = new RTCSessionDescription(sdp);
        peer.setRemoteDescription(desc).catch((e) => console.log(e));

        setConsumers((prev) => {
            const consumers = new Map(prev);

            consumers.set(participantId, {
                id: stream.id,
                participantId,
                stream,
            });

            return consumers;
        });

        await handleListProducer(activeProducers);
    };

    const handleListProducer = async (activeProducers: string[]) => {
        const data: Record<
            string,
            {
                senderId: string;
                kind: string;
                sdp: RTCSessionDescription | null;
            }
        > = {};

        activeProducers.forEach((producerId) => {
            data[producerId] = {
                senderId: producerId,
                kind: "video/audio",
                sdp: null,
            };
        });

        const consumers = activeProducers.map(async (producerId) => {
            const peer = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: "stun:stun.stunprotocol.org",
                    },
                ],
            });

            peer.ontrack = (e) => {
                const combinedStream = new MediaStream();
                e.streams.forEach((stream) => {
                    stream.getTracks().forEach((track) => {
                        combinedStream.addTrack(track);
                    });
                });

                setConsumers((prev) => {
                    const consumers = new Map(prev);
                    consumers.set(producerId, {
                        id: combinedStream.id,
                        participantId: producerId,
                        stream: combinedStream,
                    });
                    return consumers;
                });
            };

            const resSdp = new Promise<RTCPeerConnection>((resolve) => {
                peer.onnegotiationneeded = async () => {
                    if (peer.signalingState === "stable") {
                        const offer = await peer.createOffer();
                        await peer.setLocalDescription(offer);
                        data[producerId].sdp = peer.localDescription;
                        resolve(peer);
                    }
                };
            });

            peer.addTransceiver("audio", { direction: "recvonly" });
            peer.addTransceiver("video", { direction: "recvonly" });

            return {
                peer: await resSdp,
                producerId,
            };
        });

        const peers = await Promise.all(consumers);

        const resConsumers = new Promise<string>((resolve) => {
            socket.once("consumers-created", (data: string) => {
                resolve(data);
            });
        });

        sendMessage(
            "fetch-existing-producers",
            {
                channelId: roomId,
                data,
            },
            "POST"
        );

        const resConsumersEncrypted = await resConsumers;
        const resConsumersData = JSON.parse(
            decrypt(resConsumersEncrypted)
        ) as Array<{
            sdp: RTCSessionDescription;
            kind: string[];
            participantId: string;
        }>;

        console.log("resConsumersData", resConsumersData);

        resConsumersData?.forEach((consumer) => {
            const peerInfo = peers.find(
                (p) => p.producerId === consumer.participantId
            );
            if (peerInfo) {
                const descConsumer = new RTCSessionDescription(consumer.sdp);
                peerInfo.peer
                    .setRemoteDescription(descConsumer)
                    .catch((e) =>
                        console.log("Error setting remote description", e)
                    );
            }
        });
    };

    const handleNewProducer = (data: string) => {
        const { producerId, kind } = JSON.parse(decrypt(data));

        console.log("New producer connected", { producerId, kind });

        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org",
                },
            ],
        });

        peer.ontrack = (e) => {
            const combinedStream = new MediaStream();
            e.streams.forEach((stream) => {
                stream.getTracks().forEach((track) => {
                    combinedStream.addTrack(track);
                });
            });

            setConsumers((prev) => {
                const consumers = new Map(prev);
                consumers.set(producerId, {
                    id: combinedStream.id,
                    participantId: producerId,
                    stream: combinedStream,
                });
                return consumers;
            });
        };

        peer.onnegotiationneeded = async () => {
            if (peer.signalingState !== "stable") return;
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            const payload = {
                sdp: peer.localDescription,
                participantId: producerId,
                kind,
                channelId: roomId,
            };

            const resConsumer = new Promise<string>((resolve) => {
                socket.once("consumer-connected", (data: string) => {
                    resolve(data);
                });
            });

            sendMessage("create-consumer-for-producer", payload, "POST");

            const resConsumerEncrypted = await resConsumer;
            const data = JSON.parse(decrypt(resConsumerEncrypted));
            const descConsumer = new RTCSessionDescription(data.sdp);
            peer.setRemoteDescription(descConsumer).catch((e) =>
                console.log("Error setting remote description", e)
            );
        };

        peer.addTransceiver("audio", { direction: "recvonly" });
        peer.addTransceiver("video", { direction: "recvonly" });
    };

    const setupListeners = () => {
        addListener("new-producer", handleNewProducer);

        return () => {
            removeListener("new-producer", handleNewProducer);
        };
    };

    useEffect(() => {
        const cleanup = setupListeners();

        initProducer();

        return cleanup;
    }, []);

    return (
        <div className="grid grid-cols-2 gap-4">
            {[...consumers.values()].map((streamInfo) => (
                <Consumer
                    key={streamInfo.participantId}
                    roomId={roomId}
                    stream={streamInfo.stream}
                    isLocal={streamInfo.participantId === socket.id}
                />
            ))}
        </div>
    );
};

export default memo(VideoCall);
