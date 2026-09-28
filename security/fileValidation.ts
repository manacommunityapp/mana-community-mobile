import { Alert, Platform } from 'react-native';

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

function inferMimeType(uri: string, declaredType?: string): string {
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

export function showFileValidationError(error: string): void {
  Alert.alert('Invalid File', error);
}
