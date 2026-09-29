import { Alert, Platform } from 'react-native';
import { AxiosError } from 'axios';
import { logSecurityEvent } from './errorHandler';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif',
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  detectedMimeType?: string;
}

function getExtension(uri: string): string {
  const parts = uri.split('.');
  return (parts[parts.length - 1] ?? '').toLowerCase().split('?')[0] ?? '';
}

export function inferMimeType(uri: string, declaredType?: string): string {
  const ext = getExtension(uri);
  const extMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
  };
  return extMap[ext] ?? declaredType ?? 'application/octet-stream';
}

function generateSafeName(originalName: string): string {
  const ext = getExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `upload_${timestamp}_${random}.${ext}`;
}

export function validateImageFile(
  uri: string,
  fileSize?: number,
  declaredMimeType?: string,
  maxSize: number = MAX_IMAGE_SIZE_BYTES,
): FileValidationResult {
  const ext = getExtension(uri);
  const mimeType = inferMimeType(uri, declaredMimeType);

  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type .${ext} is not allowed. Use JPEG, PNG, or WebP.` };
  }

  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return { valid: false, error: `File type ${mimeType} is not allowed.` };
  }

  if (fileSize !== undefined && fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File is too large. Maximum size is ${maxMB}MB.` };
  }

  if (fileSize !== undefined && fileSize === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  return {
    valid: true,
    sanitizedName: generateSafeName(uri),
    detectedMimeType: mimeType,
  };
}

export function validateDocumentFile(
  uri: string,
  fileSize?: number,
  declaredMimeType?: string,
): FileValidationResult {
  const ext = getExtension(uri);
  const mimeType = inferMimeType(uri, declaredMimeType);

  const allowedExts = new Set([...ALLOWED_IMAGE_EXTENSIONS, 'pdf']);
  if (!allowedExts.has(ext)) {
    return { valid: false, error: `File type .${ext} is not allowed. Use JPEG, PNG, WebP, or PDF.` };
  }

  if (!ALLOWED_DOCUMENT_TYPES.has(mimeType)) {
    return { valid: false, error: `File type ${mimeType} is not allowed.` };
  }

  if (fileSize !== undefined && fileSize > MAX_DOCUMENT_SIZE_BYTES) {
    return { valid: false, error: 'File is too large. Maximum size is 20MB.' };
  }

  if (fileSize !== undefined && fileSize === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  return {
    valid: true,
    sanitizedName: generateSafeName(uri),
    detectedMimeType: mimeType,
  };
}

export function validateProfilePhoto(
  uri: string,
  fileSize?: number,
  declaredMimeType?: string,
): FileValidationResult {
  return validateImageFile(uri, fileSize, declaredMimeType, MAX_PROFILE_PHOTO_SIZE_BYTES);
}

export function showFileValidationError(error: string | FileValidationResult): void {
  const msg = typeof error === 'string' ? error : (error.error ?? 'Invalid file');
  Alert.alert('Invalid File', msg);
}

// ── Server-Side Upload Verification & Rejection Handling ────────────────

export interface ServerUploadPayload {
  url?: string;
  cdnUrl?: string;
  photoUrl?: string;
  id?: string | number;
  error?: string;
  status?: string | number;
  message?: string;
  [key: string]: unknown;
}

/**
 * Verifies that the server genuinely accepted the uploaded file and returned
 * a valid, secure resource URL. Throws an Error if the server rejected the file.
 */
export function verifyServerUploadResponse(responseData: unknown): string {
  if (!responseData || typeof responseData !== 'object') {
    throw new Error('Server returned an empty or invalid response for file upload.');
  }

  const data = responseData as ServerUploadPayload;

  // Check for server-side rejection status or error field in 200/201 response
  if (data.status === 'REJECTED' || data.status === 'ERROR') {
    const reason = data.message || data.error || 'Server rejected the uploaded file.';
    logSecurityEvent('SERVER_FILE_REJECTION_IN_PAYLOAD', { reason, data });
    throw new Error(reason);
  }

  // Extract returned URL (handles MediaResponse { url, cdnUrl } and profile { photoUrl })
  const verifiedUrl = data.url || data.cdnUrl || data.photoUrl;
  if (!verifiedUrl || typeof verifiedUrl !== 'string' || verifiedUrl.trim().length === 0) {
    throw new Error('Server accepted upload but failed to return a valid file URL.');
  }

  return verifiedUrl.trim();
}

/**
 * Determines whether an error was caused by a server-side file rejection
 * (MIME type mismatch, corrupted image, magic bytes check failure, size limit, etc.).
 */
export function isServerFileRejection(error: unknown): boolean {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error;
    const msg = (error.response?.data?.message || '').toLowerCase();

    if (status === 413 || status === 415 || status === 422) return true;
    if (errorCode === 'INVALID_FILE' || errorCode === 'UNSUPPORTED_MEDIA_TYPE' || errorCode === 'PAYLOAD_TOO_LARGE') {
      return true;
    }
    if (
      msg.includes('mime') ||
      msg.includes('format') ||
      msg.includes('image') ||
      msg.includes('corrupted') ||
      msg.includes('file') ||
      msg.includes('size') ||
      msg.includes('extension') ||
      msg.includes('upload')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts and verifies the exact server-side rejection reason from an upload error.
 * Translates HTTP status codes and backend exception payloads into actionable, safe messages.
 */
export function verifyServerUploadRejection(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;
    const errorCode = error.response?.data?.error;

    // Log the security rejection event
    logSecurityEvent('FILE_UPLOAD_SERVER_REJECTION', {
      status,
      errorCode,
      serverMessage,
      path: error.config?.url,
    });

    // 1. If backend returned a specific, safe error message, present it
    if (
      typeof serverMessage === 'string' &&
      serverMessage.trim().length > 0 &&
      serverMessage.length < 250 &&
      !containsSensitiveServerInfo(serverMessage)
    ) {
      return serverMessage.trim();
    }

    // 2. Map standard HTTP file rejection status codes
    if (status === 413) {
      return 'The uploaded file exceeds the server size limit. Please choose a smaller file.';
    }
    if (status === 415) {
      return 'The server rejected this file format. Allowed formats: JPG, PNG, WebP, or PDF.';
    }
    if (status === 422) {
      return 'The server could not process the file. The file may be corrupted or disguised.';
    }
    if (status === 400) {
      if (errorCode === 'INVALID_FILE') {
        return 'The server rejected the file. Please ensure it is a valid, uncorrupted image or document.';
      }
      return 'The uploaded file failed server-side validation. Please verify file type and integrity.';
    }
    if (status === 403) {
      return 'You do not have permission to upload files to this section.';
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return 'Upload timed out. Please check your network connection and try again.';
    }
  }

  if (error instanceof Error) {
    if (!containsSensitiveServerInfo(error.message) && error.message.length < 200) {
      return error.message;
    }
  }

  return 'The server was unable to accept the file upload. Please try again with a valid file.';
}

function containsSensitiveServerInfo(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('sql') ||
    lower.includes('hibernate') ||
    lower.includes('exception') ||
    lower.includes('stack') ||
    lower.includes('postgres') ||
    lower.includes('database') ||
    lower.includes('null pointer') ||
    lower.includes('aws') ||
    lower.includes('secret')
  );
}

/**
 * Displays an alert with the verified server-side rejection reason.
 */
export function showServerUploadRejection(error: unknown, title: string = 'Upload Rejected'): void {
  const reason = verifyServerUploadRejection(error);
  Alert.alert(title, reason);
}

