import { CONFIG } from '@/constants/config';
import { getAccessTokenSync } from '@/services/apiClient';

/**
 * Returns authorization headers if the URL points to the backend /api/files/** endpoint.
 */
export function getImageHeaders(url?: string | null): Record<string, string> | undefined {
  if (!url) return undefined;
  if (url.includes('/api/files/') || url.includes('/files/')) {
    const token = getAccessTokenSync();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return undefined;
}

/**
 * Returns an ImageSourcePropType object with uri and Authorization headers if pointing to /api/files/**.
 */
export function getImageSource(url?: string | null, fallback: string = ''): { uri: string; headers?: Record<string, string> } {
  const uri = resolveImageUrl(url, fallback);
  const headers = getImageHeaders(uri);
  return headers ? { uri, headers } : { uri };
}

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
 * Normalizes any image URL (including AWS S3 URIs, relative media paths,
 * localhost/loopback/stale IPs, bare file IDs, and backend host URLs) for the React Native mobile app.
 */
export function resolveImageUrl(url?: string | null, fallback: string = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]'
  ) {
    return fallback;
  }

  // 1. Data URLs & Local Device File URLs (e.g. preview, base64, camera file, iOS asset)
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('content://')
  ) {
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

  // 3. Localhost, loopback, or stale decommissioned server IP rewrites:
  // e.g. http://localhost:8080/api/files/1 -> http://3.111.198.165:8081/api/files/1
  // E.g. http://10.0.2.2:8081/files/1 -> http://3.111.198.165:8081/api/files/1
  // E.g. http://3.109.145.130:8081/api/files/1 -> http://3.111.198.165:8081/api/files/1
  const localOrStaleMatch = trimmed.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2|3\.109\.145\.130)(?::\d+)?(\/.*)?$/i
  );
  if (localOrStaleMatch) {
    const path = localOrStaleMatch[1] || '';
    if (path.startsWith('/api/')) {
      return `${CONFIG.API_BASE_URL}${path}`;
    }
    if (path.startsWith('/files/') || path.startsWith('/media/') || path.startsWith('/uploads/')) {
      return `${CONFIG.API_BASE_URL}/api${path}`;
    }
    if (path) {
      return `${CONFIG.API_BASE_URL}${path}`;
    }
    return CONFIG.API_BASE_URL;
  }

  // 4. AWS S3 HTTP/HTTPS URLs (private bucket or expired presigned URLs)
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

  // 5. Existing absolute HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's targeting the backend API host directly, ensure it uses /api/files/ if it was /files/
    if (trimmed.startsWith(CONFIG.API_BASE_URL)) {
      const subPath = trimmed.slice(CONFIG.API_BASE_URL.length);
      if (subPath.startsWith('/files/')) {
        return `${CONFIG.API_BASE_URL}/api${subPath}`;
      }
      return trimmed;
    }

    // Auto-upgrade insecure http:// to https:// for known secure CDNs to avoid Android cleartext restrictions
    if (
      trimmed.startsWith('http://images.unsplash.com') ||
      trimmed.startsWith('http://cdn.') ||
      trimmed.startsWith('http://res.cloudinary.com') ||
      trimmed.startsWith('http://i.imgur.com')
    ) {
      return `https://${trimmed.slice('http://'.length)}`;
    }

    return trimmed;
  }

  // 6. Relative paths starting with /api/
  if (trimmed.startsWith('/api/')) {
    return `${CONFIG.API_BASE_URL}${trimmed}`;
  }

  // 7. Relative paths starting with / (e.g. /files/..., /media/..., /uploads/...)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('/media/') || trimmed.startsWith('/files/') || trimmed.startsWith('/uploads/')) {
      return `${CONFIG.API_BASE_URL}/api${trimmed}`;
    }
    return `${CONFIG.API_BASE_URL}${trimmed}`;
  }

  // 8. Bare relative key or media path (e.g. api/files/..., media/..., files/...)
  if (trimmed.startsWith('api/')) {
    return `${CONFIG.API_BASE_URL}/${trimmed}`;
  }
  if (trimmed.startsWith('media/') || trimmed.startsWith('files/') || trimmed.startsWith('uploads/')) {
    return `${CONFIG.API_BASE_URL}/api/${trimmed}`;
  }

  // 9. Bare identifier or image filename (e.g. "42" or "uuid-photo.png")
  if (/^(\d+|[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|gif|svg))$/i.test(trimmed)) {
    return `${CONFIG.API_BASE_URL}/api/files/${trimmed}`;
  }

  return trimmed;
}

/**
 * Resolves user/profile avatar picture from any user, author, or member object.
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
    user.authorPhoto ||
    user.authorProfilePic ||
    user.authorAvatar ||
    user.profile_pic_url ||
    user.picture;

  return resolveImageUrl(raw, fallback);
}
