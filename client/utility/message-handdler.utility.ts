export const handleSendMessage = ({
    type,
    value,
    user,
    channel,
    member,
    query,
    addPendingMessage,
    sendMessage,
}: {
    type: string;
    value: { content: string };
    user: any;
    channel?: any;
    member: any;
    query: Record<string, any>;
    addPendingMessage: Function;
    sendMessage: Function;
}) => {
    if (!sendMessage || !user) return;
    const timestamp = Date.now();

    if (type === "channel" && channel) {
        addPendingMessage({
            message: value.content,
            name: `${user.firstName || ""} ${user.lastName || ""}`,
            role: member.role,
            timestamp,
            userImage: user.imageUrl,
            channelId: channel.id,
            userId: user.id,
        });

        sendMessage(
            "send_message",
            {
                content: value.content,
                channelId: channel.id,
                memberId: query.memberId,
                serverId: query.serverId,
                timestamp,
            },
            "POST"
        );
    }
};
