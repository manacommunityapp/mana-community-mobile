import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Partner HMAC Signing, Replay Defense & API Versioning (Mobile Spec)', () => {
  const MAX_TIMESTAMP_DRIFT_SECONDS = 300;

  function buildCanonicalPayload(method, path, timestampSec, nonce, rawBody) {
    return `${(method || 'POST').toUpperCase()}\n${path || '/'}\n${timestampSec}\n${nonce}\n${rawBody ?? ''}`;
  }

  function signCanonical(secretHex, canonical) {
    return crypto.createHmac('sha256', Buffer.from(secretHex, 'hex')).update(canonical, 'utf8').digest('hex');
  }

  function parseDeprecationHeaders(headers) {
    const get = (name) => {
      const k = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
      return k ? headers[k] : null;
    };
    const link = get('Link');
    const match = link ? link.match(/<([^>]+)>\s*;\s*rel=["']?successor-version["']?/i) : null;
    return {
      deprecated: get('Deprecation') === 'true',
      sunsetDate: get('Sunset'),
      successorUrl: match ? match[1] : null,
      apiVersion: get('X-API-Version'),
    };
  }

  it('1. Signs canonical webhook string with HMAC-SHA256 and detects payload tampering', () => {
    const secretHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const body = '{"gateId":"BARRIER-NORTH","cmd":"OPEN"}';
    const canonical = buildCanonicalPayload('POST', '/api/v1/partners/keys/verify', 1760000100, 'n-101', body);
    const sig = signCanonical(secretHex, canonical);

    const expected = signCanonical(
      secretHex,
      'POST\n/api/v1/partners/keys/verify\n1760000100\nn-101\n{"gateId":"BARRIER-NORTH","cmd":"OPEN"}',
    );
    assert.equal(sig, expected);

    const tampered = signCanonical(
      secretHex,
      buildCanonicalPayload('POST', '/api/v1/partners/keys/verify', 1760000100, 'n-101', '{"gateId":"VIP"}'),
    );
    assert.notEqual(sig, tampered);
  });

  it('2. Rejects timestamps outside 300s tolerance window and duplicate nonces', () => {
    const nowSec = 1760000500;
    const seenNonces = new Set();

    const verifyWindowAndNonce = (ts, nonce) => {
      if (Math.abs(nowSec - ts) > MAX_TIMESTAMP_DRIFT_SECONDS) return 'TIMESTAMP_EXPIRED';
      if (seenNonces.has(nonce)) return 'REPLAY_DETECTED';
      seenNonces.add(nonce);
      return 'VERIFIED';
    };

    assert.equal(verifyWindowAndNonce(nowSec - 350, 'n-old'), 'TIMESTAMP_EXPIRED');
    assert.equal(verifyWindowAndNonce(nowSec - 20, 'n-fresh'), 'VERIFIED');
    assert.equal(verifyWindowAndNonce(nowSec - 20, 'n-fresh'), 'REPLAY_DETECTED');
  });

  it('3. Extracts RFC 8594 Deprecation, Sunset, and successor-version Link headers', () => {
    const parsed = parseDeprecationHeaders({
      Deprecation: 'true',
      Sunset: 'Wed, 30 Sep 2027 23:59:59 GMT',
      Link: '</api/v2/hardware/sync>; rel="successor-version"',
      'X-API-Version': '1.0',
    });

    assert.deepEqual(parsed, {
      deprecated: true,
      sunsetDate: 'Wed, 30 Sep 2027 23:59:59 GMT',
      successorUrl: '/api/v2/hardware/sync',
      apiVersion: '1.0',
    });
  });
});
