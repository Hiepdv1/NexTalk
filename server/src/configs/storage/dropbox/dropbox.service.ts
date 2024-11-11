import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { Dropbox } from 'dropbox';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DropboxService {
  private readonly dbx: Dropbox;

  constructor(private configService: ConfigService) {
    this.dbx = new Dropbox({
      accessToken: configService.get<string>('DROPBOX_ACCESS_TOKEN'),
      fetch,
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
        ? `${options.path}/${uniqueId}-${fileName}`
        : `/Discord-app/${uniqueId}-${fileName}`;

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
    } catch (error) {
      console.error('Error uploading file to Dropbox:', error);
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
