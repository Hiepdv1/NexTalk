import { v4 as genuid } from 'uuid';
import sharp from 'sharp';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { ICloudinaryFile } from './cloudinary.config';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface ISize {
  width: number;
  height: number;
  mimetype?: string;
}

type Folder =
  | 'Discord'
  | 'Discord/videos'
  | 'Discord/images'
  | 'Discord/ServerImages';

@Injectable()
export class CloudinaryService {
  private async UploadStream(
    file: ICloudinaryFile,
    sizes: ISize,
    folder?: string
  ): Promise<{ _id: string; url: string }> {
    return new Promise(async (resolve, reject) => {
      let resizedBuffer: Buffer = file.buffer;
      if (sizes.mimetype === 'image/gif') {
        resizedBuffer = file.buffer;
      } else if (sizes.mimetype.startsWith('image/')) {
        resizedBuffer = await sharp(file.buffer).resize(sizes).toBuffer();
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder,
          public_id: genuid(),
        },
        (
          err: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined
        ) => {
          if (result) {
            // When stored directly on the server, remove files after they are uploaded
            // fs.unlink(file.path, (errFs) => {
            //     if (errFs) reject(errFs);
            // });
            resolve({
              _id: result.public_id,
              url: result.secure_url,
            });
          }
          reject(err);
        }
      );
      uploadStream.end(resizedBuffer);
    });
  }

  async UploadFile(
    files: ICloudinaryFile[] | ICloudinaryFile,
    folder: Folder,
    mimetype?: string,
    sizes?: ISize
  ) {
    const resize = {
      width: sizes?.width || 500,
      height: sizes?.height || 500,
      mimetype: mimetype,
    };
    if (Array.isArray(files)) {
      const filesPromise = files.map((file) =>
        this.UploadStream(file, resize, folder)
      );
      const result = await Promise.all(filesPromise);
      return result;
    } else {
      const uploadToCloud = await this.UploadStream(files, resize, folder);
      return uploadToCloud;
    }
  }

  public async createThumbnailFromVideo(
    publicId: string,
    timestamp: string,
    resize?: { width: number; height: number }
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const thumbnailUrl = cloudinary.url(publicId, {
          resource_type: 'video',
          start_offset: timestamp,
          width: resize?.width || 200,
          height: resize?.height || 200,
          crop: 'scale',
          format: 'jpg',
        });
        const response = await axios.get(thumbnailUrl, {
          responseType: 'arraybuffer',
        });
        resolve(Buffer.from(response.data));
      } catch (error) {
        reject(error);
      }
    });
  }

  public async uploadBuffer(
    buffer: Buffer,
    folder: string,
    fileName: string
  ): Promise<{ _id: string; url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, public_id: fileName, resource_type: 'image' },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({ _id: result.public_id, url: result.secure_url });
        }
      );
      uploadStream.end(buffer);
    });
  }

  private async DestroyStream(cloudId: string) {
    const destroyStream = await cloudinary.uploader.destroy(cloudId);

    if (destroyStream.result === 'ok') {
      return { cloudId, status: 'deleted' };
    }

    return { cloudId, status: 'not_found', message: destroyStream.message };
  }

  async Destroy(cloudIds: string | Array<string>) {
    if (Array.isArray(cloudIds)) {
      const destroyPromise = cloudIds.map((cloudId) =>
        this.DestroyStream(cloudId)
      );
      const result = await Promise.all(destroyPromise);
      console.log(result);
      return result;
    } else {
      const result = await this.DestroyStream(cloudIds);
      console.log(result);
      return result;
    }
  }
}
