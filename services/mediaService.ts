import { Platform } from 'react-native';
import api from './apiClient';
import type {
  PresignedUploadRequest,
  PresignedUrlResponse,
  MediaResponse,
  MediaModuleType,
  MediaTypeKind,
} from '@/types/api';

export interface LocalMediaFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export const mediaService = {
  /**
   * Request a presigned S3 upload URL
   */
  async getPresignedUploadUrl(
    request: PresignedUploadRequest,
  ): Promise<PresignedUrlResponse> {
    const res = await api.post<PresignedUrlResponse>(
      '/media/presigned-upload',
      request,
    );
    return res.data;
  },

  /**
   * Direct binary PUT to S3 using the presigned URL
   */
  async uploadBinaryToS3(
    presignedUrl: string,
    fileUri: string,
    mimeType: string,
  ): Promise<void> {
    const cleanUri =
      Platform.OS === 'android' ? fileUri : fileUri.replace('file://', '');

    const response = await fetch(cleanUri);
    const blob = await response.blob();

    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!putRes.ok) {
      throw new Error(`S3 upload failed with status ${putRes.status}`);
    }
  },

  /**
   * Confirm presigned upload with backend session ID
   */
  async confirmPresignedUpload(sessionId: string): Promise<MediaResponse> {
    const res = await api.post<MediaResponse>(
      `/media/presigned-upload/confirm/${sessionId}`,
    );
    return res.data;
  },

  /**
   * Direct multipart upload fallback
   */
  async uploadMultipart(
    file: LocalMediaFile,
    request: Partial<PresignedUploadRequest>,
  ): Promise<MediaResponse> {
    const form = new FormData();
    form.append('file', {
      uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
      name: file.name,
      type: file.type,
    } as any);

    const uploadMeta = {
      module: request.module || 'GENERAL',
      moduleId: request.moduleId || 'default',
      communityId: request.communityId || 1,
      mediaType: request.mediaType || 'IMAGE',
      caption: request.caption,
      altText: request.altText,
    };

    form.append(
      'request',
      new Blob([JSON.stringify(uploadMeta)], { type: 'application/json' }) as any,
    );

    const res = await api.post<MediaResponse>('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * High-level resilient upload:
   * 1. Attempts presigned S3 pipeline
   * 2. Automatically falls back to multipart /media/upload if S3 is unavailable or errors
   */
  async uploadMedia(
    file: LocalMediaFile,
    options: {
      module: MediaModuleType;
      moduleId: string;
      communityId: number;
      mediaType?: MediaTypeKind;
      caption?: string;
      altText?: string;
    },
  ): Promise<MediaResponse> {
    const mediaType = options.mediaType || (file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');

    // Attempt presigned S3 pipeline
    try {
      const presigned = await this.getPresignedUploadUrl({
        module: options.module,
        moduleId: options.moduleId,
        communityId: options.communityId,
        mediaType,
        mimeType: file.type || 'image/jpeg',
        originalFileName: file.name || 'upload.jpg',
        fileSize: file.size,
        caption: options.caption,
        altText: options.altText,
      });

      await this.uploadBinaryToS3(
        presigned.presignedUploadUrl,
        file.uri,
        presigned.contentType || file.type || 'image/jpeg',
      );

      return await this.confirmPresignedUpload(presigned.sessionId);
    } catch (presignedErr) {
      console.warn(
        'Presigned S3 upload failed or not configured; falling back to multipart /media/upload',
        presignedErr,
      );

      // Graceful fallback to standard multipart upload
      return await this.uploadMultipart(file, {
        module: options.module,
        moduleId: options.moduleId,
        communityId: options.communityId,
        mediaType,
        caption: options.caption,
        altText: options.altText,
      });
    }
  },
};
