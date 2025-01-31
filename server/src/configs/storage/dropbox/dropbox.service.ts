import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { Dropbox, DropboxAuth } from 'dropbox';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DropboxService {
  private readonly dbx: Dropbox;
  private readonly auth: DropboxAuth;

  constructor(private configService: ConfigService) {
    this.auth = new DropboxAuth({
      clientId: this.configService.get('DROPBOX_APP_KEY'),
      clientSecret: this.configService.get('DROPBOX_APP_SECRET'),
      refreshToken: this.configService.get('DROPBOX_REFRESH_TOKEN'),
    });

    this.dbx = new Dropbox({
      fetch,
      auth: this.auth,
    });
  }

  public async uploadFile(
    fileName: string,
    fileContent: Buffer,
    options?: { path: string }
  ) {
    try {
      const uniqueId = uuidv4();
      const dropboxPath = options.path
        ? `${options.path}/${uniqueId}:::${fileName}`
        : `/NexTalk/${uniqueId}:::${fileName}`;

      const fileUploaded = await this.dbx.filesUpload({
        path: dropboxPath,
        contents: fileContent,
      });

      const sharedLinkResponse =
        await this.dbx.sharingCreateSharedLinkWithSettings({
          path: fileUploaded.result.path_lower,
        });

      const fileUrl = sharedLinkResponse.result.url.replace('&dl=0', '&raw=1');

      return { file: fileUploaded.result, url: fileUrl };
    } catch (error: any) {
      console.error('Error uploading file to Dropbox:', error);

      if (error?.status && error.status === 400) {
        throw new BadRequestException(error.message);
      }

      throw new BadGatewayException(error.message);
    }
  }

  public async deleteFile(filePath: string) {
    const deletedFile = await this.dbx.filesDeleteV2({
      path: filePath,
    });
    return deletedFile.result;
  }

  public async downloadFile(filePath: string) {
    const file = await this.dbx.filesDownload({ path: filePath });
    const result = file.result as any;

    const blob = result.fileBinary as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      fileName: result.name,
      fileContent: buffer,
    };
  }
}
