import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE_URL = 'http://3.111.198.165:8081';

function resolveImageUrl(url, fallback = '') {
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

  // 1. Data URLs & Local Device File URLs
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
      return `${API_BASE_URL}/api/files/${key}`;
    }
    return fallback;
  }

  // 3. Localhost, loopback, or stale decommissioned server IP rewrites
  const localOrStaleMatch = trimmed.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2|3\.109\.145\.130)(?::\d+)?(\/.*)?$/i
  );
  if (localOrStaleMatch) {
    const path = localOrStaleMatch[1] || '';
    if (path.startsWith('/api/')) {
      return `${API_BASE_URL}${path}`;
    }
    if (path.startsWith('/files/') || path.startsWith('/media/') || path.startsWith('/uploads/')) {
      return `${API_BASE_URL}/api${path}`;
    }
    if (path) {
      return `${API_BASE_URL}${path}`;
    }
    return API_BASE_URL;
  }

  // 4. AWS S3 HTTP/HTTPS URLs
  const isS3Url = trimmed.includes('.s3.') || trimmed.includes('.s3-') || trimmed.includes('.s3.amazonaws.com');
  if (isS3Url) {
    const hasSignature = trimmed.includes('X-Amz-Signature') || trimmed.includes('X-Amz-Date');
    const isOurBucket = trimmed.includes('manacommunityhub');

    if (!hasSignature || isOurBucket) {
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
          return `${API_BASE_URL}/api/files/${s3Key}`;
        }
      } catch {
        // Fall through
      }
    }
  }

  // 5. Existing absolute HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.startsWith(API_BASE_URL)) {
      const subPath = trimmed.slice(API_BASE_URL.length);
      if (subPath.startsWith('/files/')) {
        return `${API_BASE_URL}/api${subPath}`;
      }
      return trimmed;
    }

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
    return `${API_BASE_URL}${trimmed}`;
  }

  // 7. Relative paths starting with /
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('/media/') || trimmed.startsWith('/files/') || trimmed.startsWith('/uploads/')) {
      return `${API_BASE_URL}/api${trimmed}`;
    }
    return `${API_BASE_URL}${trimmed}`;
  }

  // 8. Bare relative key or media path
  if (trimmed.startsWith('api/')) {
    return `${API_BASE_URL}/${trimmed}`;
  }
  if (trimmed.startsWith('media/') || trimmed.startsWith('files/') || trimmed.startsWith('uploads/')) {
    return `${API_BASE_URL}/api/${trimmed}`;
  }

  // 9. Bare identifier or image filename
  if (/^(\d+|[a-zA-Z0-9_.-]+\.(?:jpe?g|png|webp|gif|svg))$/i.test(trimmed)) {
    return `${API_BASE_URL}/api/files/${trimmed}`;
  }

  return trimmed;
}

function resolveUserAvatar(user, fallback = '') {
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

describe('Mobile Image URL Resolution & Normalization Spec', () => {
  it('1. Handles null, undefined, empty, and invalid inputs gracefully', () => {
    assert.strictEqual(resolveImageUrl(null), '');
    assert.strictEqual(resolveImageUrl(undefined), '');
    assert.strictEqual(resolveImageUrl(''), '');
    assert.strictEqual(resolveImageUrl('   '), '');
    assert.strictEqual(resolveImageUrl('null'), '');
    assert.strictEqual(resolveImageUrl('undefined'), '');
    assert.strictEqual(resolveImageUrl('[object Object]'), '');
    assert.strictEqual(resolveImageUrl(null, 'https://fallback.com/avatar.png'), 'https://fallback.com/avatar.png');
  });

  it('2. Preserves local file schemes and data URIs untouched', () => {
    assert.strictEqual(resolveImageUrl('file:///data/user/0/com.app/cache/photo.jpg'), 'file:///data/user/0/com.app/cache/photo.jpg');
    assert.strictEqual(resolveImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
    assert.strictEqual(resolveImageUrl('blob:http://localhost:8081/blob-id'), 'blob:http://localhost:8081/blob-id');
    assert.strictEqual(resolveImageUrl('ph://CC9507E7-D205-4B96-935C-68CE30595C88'), 'ph://CC9507E7-D205-4B96-935C-68CE30595C88');
    assert.strictEqual(resolveImageUrl('content://media/external/images/media/1234'), 'content://media/external/images/media/1234');
  });

  it('3. Converts s3:// protocol URIs to backend API file stream endpoints', () => {
    const s3Uri = 's3://manacommunityhub/events/10/banner.jpg';
    const resolved = resolveImageUrl(s3Uri);
    assert.strictEqual(resolved, `${API_BASE_URL}/api/files/events/10/banner.jpg`);
  });

  it('4. Normalizes relative paths to full backend URLs', () => {
    assert.strictEqual(resolveImageUrl('/api/files/104'), `${API_BASE_URL}/api/files/104`);
    assert.strictEqual(resolveImageUrl('/files/104'), `${API_BASE_URL}/api/files/104`);
    assert.strictEqual(resolveImageUrl('/media/posts/pic.png'), `${API_BASE_URL}/api/media/posts/pic.png`);
    assert.strictEqual(resolveImageUrl('/uploads/avatars/user1.jpg'), `${API_BASE_URL}/api/uploads/avatars/user1.jpg`);
    assert.strictEqual(resolveImageUrl('api/files/55'), `${API_BASE_URL}/api/files/55`);
    assert.strictEqual(resolveImageUrl('files/55'), `${API_BASE_URL}/api/files/55`);
  });

  it('5. Rewrites localhost, 127.0.0.1, 10.0.2.2, and decommissioned IPs to active backend', () => {
    assert.strictEqual(
      resolveImageUrl('http://localhost:8080/api/files/1'),
      `${API_BASE_URL}/api/files/1`
    );
    assert.strictEqual(
      resolveImageUrl('http://localhost:8081/api/files/2'),
      `${API_BASE_URL}/api/files/2`
    );
    assert.strictEqual(
      resolveImageUrl('http://127.0.0.1:8081/api/files/3'),
      `${API_BASE_URL}/api/files/3`
    );
    assert.strictEqual(
      resolveImageUrl('http://10.0.2.2:8081/files/4'),
      `${API_BASE_URL}/api/files/4`
    );
    assert.strictEqual(
      resolveImageUrl('http://3.109.145.130:8081/api/files/5'),
      `${API_BASE_URL}/api/files/5`
    );
  });

  it('6. Resolves bare file IDs and filenames to API file routes', () => {
    assert.strictEqual(resolveImageUrl('42'), `${API_BASE_URL}/api/files/42`);
    assert.strictEqual(resolveImageUrl('9999'), `${API_BASE_URL}/api/files/9999`);
    assert.strictEqual(resolveImageUrl('receipt_august.jpg'), `${API_BASE_URL}/api/files/receipt_august.jpg`);
    assert.strictEqual(resolveImageUrl('banner.png'), `${API_BASE_URL}/api/files/banner.png`);
  });

  it('7. Preserves valid external HTTPS URLs and upgrades insecure CDN URLs', () => {
    const unsplashHttps = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800';
    assert.strictEqual(resolveImageUrl(unsplashHttps), unsplashHttps);

    const unsplashHttp = 'http://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800';
    assert.strictEqual(resolveImageUrl(unsplashHttp), unsplashHttps);
  });

  it('8. Proxies private or unsigned S3 bucket URLs through backend', () => {
    const rawS3Url = 'https://manacommunityhub.s3.ap-south-1.amazonaws.com/posts/photo_123.jpg';
    assert.strictEqual(
      resolveImageUrl(rawS3Url),
      `${API_BASE_URL}/api/files/posts/photo_123.jpg`
    );
  });

  it('9. Resolves user avatars across various object formats and string inputs', () => {
    // String input
    assert.strictEqual(resolveUserAvatar('/api/files/77'), `${API_BASE_URL}/api/files/77`);

    // Standard user object with profilePicUrl
    assert.strictEqual(
      resolveUserAvatar({ profilePicUrl: '/api/files/12' }),
      `${API_BASE_URL}/api/files/12`
    );

    // Profile object with profilePhoto
    assert.strictEqual(
      resolveUserAvatar({ profilePhoto: 'http://localhost:8081/api/files/88' }),
      `${API_BASE_URL}/api/files/88`
    );

    // Feed post author with authorProfilePic
    assert.strictEqual(
      resolveUserAvatar({ authorProfilePic: '/files/99' }),
      `${API_BASE_URL}/api/files/99`
    );

    // Comment author with authorPhoto
    assert.strictEqual(
      resolveUserAvatar({ authorPhoto: 's3://manacommunityhub/avatars/u5.jpg' }),
      `${API_BASE_URL}/api/files/avatars/u5.jpg`
    );

    // Player with avatarUrl
    assert.strictEqual(
      resolveUserAvatar({ avatarUrl: '42' }),
      `${API_BASE_URL}/api/files/42`
    );

    // Null/undefined object
    assert.strictEqual(resolveUserAvatar(null), '');
    assert.strictEqual(resolveUserAvatar({}), '');
  });
});
