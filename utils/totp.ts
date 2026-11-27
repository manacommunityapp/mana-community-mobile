import type { SignedVoucherToken, VoucherTokenPayload } from '@/types/voucher';

export const QR_PREFIX = 'MANA:v1:';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function utf8ToBytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(++i);
      code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function bytesToUtf8(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if (b0 < 0xe0) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (b0 < 0xf0) {
      out += String.fromCharCode(((b0 & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    } else {
      const cp =
        (((b0 & 0x07) << 18) |
          ((bytes[i++] & 0x3f) << 12) |
          ((bytes[i++] & 0x3f) << 6) |
          (bytes[i++] & 0x3f)) -
        0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return out;
}

export function base64urlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    out += B64_CHARS[(triplet >> 18) & 0x3f];
    out += B64_CHARS[(triplet >> 12) & 0x3f];
    if (i + 1 < bytes.length) out += B64_CHARS[(triplet >> 6) & 0x3f];
    if (i + 2 < bytes.length) out += B64_CHARS[triplet & 0x3f];
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_');
}

export function base64urlDecode(str: string): Uint8Array {
  const clean = str.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = i + 2 < clean.length ? B64_CHARS.indexOf(clean[i + 2]) : -1;
    const c3 = i + 3 < clean.length ? B64_CHARS.indexOf(clean[i + 3]) : -1;
    if (c0 < 0 || c1 < 0) throw new Error('Invalid base64url');
    out.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) out.push(((c1 & 0x0f) << 4) | (c2 >> 2));
    if (c3 >= 0) out.push(((c2 & 0x03) << 6) | c3);
  }
  return new Uint8Array(out);
}

function sha1(data: Uint8Array): Uint8Array {
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(data);
  buf[msgLen] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = ((x << 1) | (x >>> 31)) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = ((((a << 5) | (a >>> 27)) >>> 0) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return out;
}

function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key.length > blockSize ? sha1(key) : key;
  const keyBlock = new Uint8Array(blockSize);
  keyBlock.set(k);

  const oPad = new Uint8Array(blockSize + 20);
  const iPad = new Uint8Array(blockSize + message.length);
  for (let i = 0; i < blockSize; i++) {
    oPad[i] = keyBlock[i] ^ 0x5c;
    iPad[i] = keyBlock[i] ^ 0x36;
  }
  iPad.set(message, blockSize);
  const innerHash = sha1(iPad);
  oPad.set(innerHash, blockSize);
  return sha1(oPad);
}

/**
 * Synchronous RFC 6238 TOTP generator (Hermes, iOS, Android, Web, Jest compatible).
 */
export function generateTotp(
  secretBase64url: string,
  unixSeconds: number = Math.floor(Date.now() / 1000),
  digits = 6,
  period = 30,
): string {
  const secretBytes = base64urlDecode(secretBase64url);
  const counter = Math.floor(unixSeconds / period);
  const counterBytes = new Uint8Array(8);
  let val = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = val & 0xff;
    val = Math.floor(val / 256);
  }

  const hash = hmacSha1(secretBytes, counterBytes);
  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

export function verifyTotp(
  secretBase64url: string,
  candidateCode: string,
  unixSeconds: number = Math.floor(Date.now() / 1000),
  digits = 6,
  period = 30,
): boolean {
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotp(secretBase64url, unixSeconds + offset * period, digits, period);
    if (expected === candidateCode) return true;
  }
  return false;
}

export function encodeQrString(token: SignedVoucherToken, totpCode: string): string {
  const payloadB64 = base64urlEncode(utf8ToBytes(JSON.stringify(token.payload)));
  return `${QR_PREFIX}${payloadB64}.${token.hmacSuffix}.${totpCode}`;
}

export interface ParsedQr {
  payloadB64: string;
  hmacSuffix: string;
  totpCode: string;
  payload: VoucherTokenPayload;
}

export function parseQrString(qrString: string): ParsedQr | null {
  try {
    if (!qrString.startsWith(QR_PREFIX)) return null;
    const body = qrString.slice(QR_PREFIX.length);
    const parts = body.split('.');
    if (parts.length !== 3) return null;
    const [payloadB64, hmacSuffix, totpCode] = parts;
    const payload: VoucherTokenPayload = JSON.parse(bytesToUtf8(base64urlDecode(payloadB64)));
    return { payloadB64, hmacSuffix, totpCode, payload };
  } catch {
    return null;
  }
}

export function isVoucherExpired(payload: VoucherTokenPayload): boolean {
  return Math.floor(Date.now() / 1000) > payload.exp;
}
