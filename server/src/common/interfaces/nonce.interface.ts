export interface MessageParams {
  url: string;
  body: any;
  nonce: string;
  timestamp: number;
}

export interface RequestClient {
  clientName: string;
  clientId: string;
  clientKey: string;
}
