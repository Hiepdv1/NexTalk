export interface ICreateUserData {
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
}

export interface ICreateServerData {
    profileId: string;
    name: string;
    image: File;
}

export interface IEditServerData {
    name: string;
    image: File;
    serverId: string;
}

export interface IResponseCreateUserData {
    userId: string;
    name: string;
    imageUrl: string;
    email: string;
    id: string;
}

export interface IResponseCreateServerData {
    id: string;
    name: string;
    imageUrl: string;
    cloudId: string;
    inviteCode: string;
    profileId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IResponseServerData extends IResponseCreateServerData {}
