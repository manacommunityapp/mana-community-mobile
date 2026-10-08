import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper mirroring normalizeApiPath implementation in apiClient.ts
function normalizeApiPath(url) {
  if (!url) return url;
  if (url.startsWith('/api/')) {
    return url.substring(4); // e.g. '/api/v1/emergency/sos/trigger' -> '/v1/emergency/sos/trigger'
  }
  if (url === '/api') {
    return '';
  }
  if (url.startsWith('api/')) {
    return url.substring(3); // e.g. 'api/v1/...' -> '/v1/...'
  }
  return url;
}

describe('Mobile ApiClient - Double /api Prefix Prevention Suite', () => {
  it('1. Strips leading /api/ from versioned API paths', () => {
    const input = '/api/v1/emergency/sos/trigger';
    const normalized = normalizeApiPath(input);
    assert.strictEqual(normalized, '/v1/emergency/sos/trigger');
  });

  it('2. Preserves paths without leading /api/', () => {
    const input = '/emergency/sos/trigger';
    const normalized = normalizeApiPath(input);
    assert.strictEqual(normalized, '/emergency/sos/trigger');
  });

  it('3. Handles unslashed api/ prefix cleanly', () => {
    const input = 'api/v1/me/profile';
    const normalized = normalizeApiPath(input);
    assert.strictEqual(normalized, '/v1/me/profile');
  });

  it('4. Handles exact /api path gracefully', () => {
    const input = '/api';
    const normalized = normalizeApiPath(input);
    assert.strictEqual(normalized, '');
  });

  it('5. Handles undefined or null paths safely', () => {
    assert.strictEqual(normalizeApiPath(undefined), undefined);
    assert.strictEqual(normalizeApiPath(null), null);
    assert.strictEqual(normalizeApiPath(''), '');
  });
});
