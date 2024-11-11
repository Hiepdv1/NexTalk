"use client";

import { useAuth } from "@clerk/nextjs";
import CreateServerModal from "../modals/Create-server-modal";
import InviteModal from "../modals/Invite-modal";
import EditServerModal from "../modals/Edit-server-modal";
import { Fragment } from "react";
import MemberModal from "../modals/Member-modal";
import CreateChannelModal from "../modals/Create-Channel-modal";
import LeaveServerModal from "../modals/Leave-server-modal";
import DeleteServerModal from "../modals/Delete-Server-Modal";
import DeleteChannelModal from "../modals/Delete-Channel-Modal";
import EditChannelModal from "../modals/Edit-Channel-modal";
import MessageFilModel from "../modals/message-file.model";
import InitialModal from "../modals/initial-modal";
import DeleteMessageModal from "../modals/Delete-Message-Modal";

const ModalProvider = () => {
    const { userId, isSignedIn } = useAuth();
    if (!isSignedIn) return null;

    return (
        <Fragment>
            <MemberModal />
            <InviteModal />
            <LeaveServerModal />
            <EditChannelModal />
            <DeleteServerModal />
            <DeleteChannelModal />
            <MessageFilModel />
            <DeleteMessageModal />
            <EditServerModal userId={userId} />
            <CreateServerModal userId={userId} />
            <CreateChannelModal userId={userId} />
        </Fragment>
    );
};

export default ModalProvider;
