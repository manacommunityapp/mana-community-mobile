import {
  base64urlEncode,
  encodeQrString,
  generateTotp,
  isVoucherExpired,
  parseQrString,
  verifyTotp,
} from '../totp';

describe('mobile totp & voucher QR utils', () => {
  it('matches RFC 6238 SHA-1 test vector', () => {
    const secretBytes = new Uint8Array(
      '12345678901234567890'.split('').map((c) => c.charCodeAt(0)),
    );
    const secretB64u = base64urlEncode(secretBytes);
    expect(generateTotp(secretB64u, 59, 6, 30)).toBe('287082');
    expect(generateTotp(secretB64u, 59, 8, 30)).toBe('94287082');
  });

  it('verifies ±1 step clock skew and round-trips QR strings', () => {
    const secretBytes = new Uint8Array(
      'mana-mobile-totp-secret'.split('').map((c) => c.charCodeAt(0)),
    );
    const secretB64u = base64urlEncode(secretBytes);
    const now = 1732730010;
    const otp = generateTotp(secretB64u, now);
    expect(verifyTotp(secretB64u, otp, now + 30)).toBe(true);
    expect(verifyTotp(secretB64u, otp, now + 90)).toBe(false);

    const token = {
      payload: {
        v: 1 as const,
        vid: 'vch_mob_1',
        uid: 'res_9',
        cid: 'camp_001',
        sid: 'soc_hyd_001',
        iat: 1732730000,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce: 'A1b2C3d4',
      },
      hmacSuffix: 'hmac1234',
      totpSecret: secretB64u,
    };
    const qr = encodeQrString(token, otp);
    const parsed = parseQrString(qr);
    expect(parsed?.payload).toEqual(token.payload);
    expect(parsed?.totpCode).toBe(otp);
    expect(isVoucherExpired(token.payload)).toBe(false);
  });
});
