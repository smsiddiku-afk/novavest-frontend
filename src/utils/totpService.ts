/**
 * Real RFC 6238 Time-Based One-Time Password (TOTP) Service
 * Compatible with Google Authenticator, Microsoft Authenticator, and Authy.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const DEFAULT_AUTH_SECRET = 'NB2W45DFOIZXE33N';

/**
 * Remove whitespace, dashes, and padding from a Base32 secret
 */
export function cleanBase32Key(rawKey: string): string {
  if (!rawKey) return DEFAULT_AUTH_SECRET;
  const cleaned = rawKey.toUpperCase().replace(/[\s=-]/g, '');
  return cleaned || DEFAULT_AUTH_SECRET;
}

/**
 * Format a Base32 key into groups of 4 for human-friendly display
 * e.g. "NB2W 45DF OIZX E33N"
 */
export function formatBase32Key(rawKey: string): string {
  const cleaned = cleanBase32Key(rawKey);
  const chunks: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    chunks.push(cleaned.slice(i, i + 4));
  }
  return chunks.join(' ');
}

/**
 * Decode Base32 string to Uint8Array bytes
 */
export function base32ToBytes(base32: string): Uint8Array {
  const cleaned = cleanBase32Key(base32);
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Pure SHA-1 implementation (FIPS PUB 180-4)
 */
function sha1(messageBytes: Uint8Array): Uint8Array {
  let H0 = 0x67452301;
  let H1 = 0xefcdab89;
  let H2 = 0x98badcfe;
  let H3 = 0x10325476;
  let H4 = 0xc3d2e1f0;

  const msgLen = messageBytes.length;
  const bitLen = msgLen * 8;
  const paddedLen = ((msgLen + 8) >> 6 << 6) + 64;
  const words = new Uint32Array(paddedLen >> 2);

  for (let i = 0; i < msgLen; i++) {
    words[i >> 2] |= messageBytes[i] << (24 - (i % 4) * 8);
  }
  words[msgLen >> 2] |= 0x80 << (24 - (msgLen % 4) * 8);
  words[words.length - 1] = bitLen & 0xffffffff;
  words[words.length - 2] = Math.floor(bitLen / 0x100000000);

  const W = new Uint32Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t];
    for (let t = 16; t < 80; t++) {
      const v = W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16];
      W[t] = (v << 1) | (v >>> 31);
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4;

    for (let t = 0; t < 80; t++) {
      let f = 0, k = 0;
      if (t < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (t < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + W[t]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const hs = [H0, H1, H2, H3, H4];
  for (let i = 0; i < 5; i++) {
    result[i * 4] = (hs[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (hs[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (hs[i] >>> 8) & 0xff;
    result[i * 4 + 3] = hs[i] & 0xff;
  }
  return result;
}

/**
 * Pure HMAC-SHA1 implementation
 */
function hmacSha1(keyBytes: Uint8Array, msgBytes: Uint8Array): Uint8Array {
  let key = keyBytes;
  if (key.length > 64) {
    key = sha1(key);
  }
  const kPad = new Uint8Array(64);
  kPad.set(key);

  const iPad = new Uint8Array(64);
  const oPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    iPad[i] = kPad[i] ^ 0x36;
    oPad[i] = kPad[i] ^ 0x5c;
  }

  const innerMsg = new Uint8Array(64 + msgBytes.length);
  innerMsg.set(iPad);
  innerMsg.set(msgBytes, 64);
  const innerHash = sha1(innerMsg);

  const outerMsg = new Uint8Array(64 + 20);
  outerMsg.set(oPad);
  outerMsg.set(innerHash, 64);
  return sha1(outerMsg);
}

/**
 * Generate standard RFC 6238 6-digit TOTP code
 * @param secret Base32 encoded secret key
 * @param offsetSteps Time step offset (-1, 0, +1 for drift tolerance)
 */
export function generateTOTP(secret: string, offsetSteps = 0): string {
  const key = base32ToBytes(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30; // standard Google Authenticator 30s period
  const counter = Math.floor(epoch / timeStep) + offsetSteps;

  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const digest = hmacSha1(key, counterBytes);
  const offset = digest[19] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Verify a 6-digit code against standard RFC 6238 TOTP
 * @param inputCode The 6-digit code entered by user
 * @param secret The user's Base32 secret key
 * @param windowSteps Drift tolerance in 30-sec steps (default 1 = ±30 seconds)
 */
export function verifyTOTP(inputCode: string, secret: string, windowSteps = 1): boolean {
  if (!inputCode) return false;
  const cleanCode = inputCode.toString().trim().replace(/\D/g, '');
  if (cleanCode.length !== 6) return false;

  const cleanSecret = cleanBase32Key(secret);

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const expected = generateTOTP(cleanSecret, offset);
    if (cleanCode === expected) {
      return true;
    }
  }

  return false;
}

/**
 * Build standard otpauth URI for Google Authenticator QR Code
 */
export function getOtpAuthUrl(
  secret: string,
  accountName: string = 'User',
  issuer: string = 'NVT Energy'
): string {
  const cleanSecret = cleanBase32Key(secret);
  const safeAccount = encodeURIComponent(accountName.trim() || 'User');
  const safeIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${safeIssuer}:${safeAccount}?secret=${cleanSecret}&issuer=${safeIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Get QR code image URL from standard QR API
 */
export function getQrCodeUrl(otpAuthUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpAuthUrl)}&color=062c22&bgcolor=ffffff&margin=1`;
}

/**
 * Generate a cryptographically random Base32 secret key (16 uppercase chars)
 */
export function generateRandomBase32Key(length = 16): string {
  const chars = BASE32_ALPHABET;
  let result = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

/**
 * Get or initialize persistent user authenticator secret
 */
export function getUserAuthenticatorSecret(userId?: string, customSecret?: string): string {
  if (customSecret && cleanBase32Key(customSecret)) {
    return cleanBase32Key(customSecret);
  }

  if (typeof window !== 'undefined' && userId) {
    try {
      const stored = localStorage.getItem(`nvt_google_auth_secret_${userId}`);
      if (stored && cleanBase32Key(stored)) return cleanBase32Key(stored);
    } catch {}
  }

  if (typeof window !== 'undefined') {
    try {
      const uStr = localStorage.getItem('nvt_auth_user') || localStorage.getItem('auth_user');
      if (uStr) {
        const u = JSON.parse(uStr);
        if (u.authenticatorSecret && cleanBase32Key(u.authenticatorSecret)) {
          return cleanBase32Key(u.authenticatorSecret);
        }
        const id = u.uid || u.memberId || u.phone;
        if (id) {
          const stored = localStorage.getItem(`nvt_google_auth_secret_${id}`);
          if (stored && cleanBase32Key(stored)) return cleanBase32Key(stored);
        }
      }
    } catch {}
  }

  return DEFAULT_AUTH_SECRET;
}
