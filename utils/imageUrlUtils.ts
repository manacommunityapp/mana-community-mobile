import { CONFIG } from '@/constants/config';

/**
 * Checks whether an AWS S3 pre-signed URL has expired or is within 5 minutes of expiring.
 */
export function isPresignedUrlExpired(url: string): boolean {
  if (!url || !url.includes('X-Amz-Date')) return false;

  try {
    const dateMatch = url.match(/[?&]X-Amz-Date=([0-9]{8}T[0-9]{6}Z)/);
    const expiresMatch = url.match(/[?&]X-Amz-Expires=([0-9]+)/);

    if (dateMatch && dateMatch[1]) {
      const amzDate = dateMatch[1];
      const match = amzDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
      if (match) {
        const signedAtMs = Date.UTC(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10),
          parseInt(match[4], 10),
          parseInt(match[5], 10),
          parseInt(match[6], 10)
        );
        const expiresSec = expiresMatch && expiresMatch[1] ? parseInt(expiresMatch[1], 10) : 3600;
        const expiresAtMs = signedAtMs + expiresSec * 1000;
        const bufferMs = 5 * 60 * 1000; // 5-minute buffer

        return Date.now() > expiresAtMs - bufferMs;
      }
    }
  } catch {
    // If URL parsing fails, assume expired
    return true;
  }

  return false;
}

/**
 * Normalizes any image URL (including AWS S3 URIs, relative media paths, and backend host URLs)
 * for the React Native mobile app.
 */
export function resolveImageUrl(url?: string | null, fallback: string = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return fallback;

  // 1. Data URLs & Local File URLs (e.g. preview, base64, camera file)
  if (trimmed.startsWith('data:') || trimmed.startsWith('file://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. AWS S3 Protocol: s3://my-bucket/path/to/image.jpg
  if (trimmed.startsWith('s3://')) {
    const withoutPrefix = trimmed.slice(5);
    const firstSlashIndex = withoutPrefix.indexOf('/');
    if (firstSlashIndex !== -1) {
      const key = withoutPrefix.slice(firstSlashIndex + 1);
      return `${CONFIG.API_BASE_URL}/api/files/${key}`;
    }
    return fallback;
  }

  // 3. Relative paths starting with /api/
  if (trimmed.startsWith('/api/')) {
    return `${CONFIG.API_BASE_URL}${trimmed}`;
  }

  // 4. Relative paths starting with / (e.g. /files/..., /media/..., /uploads/...)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('/media/') || trimmed.startsWith('/files/') || trimmed.startsWith('/uploads/')) {
      return `${CONFIG.API_BASE_URL}/api${trimmed}`;
    }
    return `${CONFIG.API_BASE_URL}${trimmed}`;
  }

  // 5. Bare relative key or media path
  if (trimmed.startsWith('media/') || trimmed.startsWith('files/') || trimmed.startsWith('uploads/')) {
    return `${CONFIG.API_BASE_URL}/api/${trimmed}`;
  }

  // 6. Absolute HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's an AWS S3 URL that is unsigned, expired, or pointing to the private manacommunityhub bucket,
    // proxy it through the backend files controller: <API_BASE_URL>/api/files/<key>
    const isS3Url = trimmed.includes('.s3.') || trimmed.includes('.s3-') || trimmed.includes('.s3.amazonaws.com');
    if (isS3Url) {
      const hasSignature = trimmed.includes('X-Amz-Signature') || trimmed.includes('X-Amz-Date');
      const isExpired = hasSignature && isPresignedUrlExpired(trimmed);
      const isOurBucket = trimmed.includes('manacommunityhub');

      if (!hasSignature || isExpired || isOurBucket) {
        try {
          const urlWithoutQuery = trimmed.split('?')[0];
          const slashIndex = urlWithoutQuery.indexOf('amazonaws.com/');
          let s3Key = '';
          if (slashIndex !== -1) {
            s3Key = urlWithoutQuery.substring(slashIndex + 'amazonaws.com/'.length);
          } else {
            const match = urlWithoutQuery.match(/^https?:\/\/[^\/]+\/(.+)$/);
            if (match) s3Key = match[1];
          }

          if (s3Key) {
            // Remove leading slashes and optional bucket name prefix
            s3Key = s3Key.replace(/^\/+/, '');
            if (s3Key.startsWith('manacommunityhub/')) {
              s3Key = s3Key.substring('manacommunityhub/'.length);
            }
            return `${CONFIG.API_BASE_URL}/api/files/${s3Key}`;
          }
        } catch {
          // Keep as-is if URL parsing fails
        }
      }
    }

    return trimmed;
  }

  return trimmed;
}

/**
 * Resolves user/profile avatar picture from any user or member object.
 */
export function resolveUserAvatar(user?: any, fallback: string = ''): string {
  if (!user) return fallback;
  if (typeof user === 'string') return resolveImageUrl(user, fallback);

  const raw =
    user.profilePicUrl ||
    user.profilePhoto ||
    user.profilePic ||
    user.picUrl ||
    user.photoUrl ||
    user.avatarUrl ||
    user.avatar ||
    user.imageUrl ||
    user.image ||
    user.profile_pic_url ||
    user.picture;

  return resolveImageUrl(raw, fallback);
}
