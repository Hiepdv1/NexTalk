export type ResICECandidateProducer = {
    type: string;
    candidate: RTCIceCandidate;
    roomId: string;
    target: string;
    producerId: string;
    userId: string;
};

export type ResICECandidateConsumer = {
    type: string;
    candidate: RTCIceCandidate;
    roomId: string;
    target: string;
    consumerId: string;
    producerId: string;
    userId: string;
};
