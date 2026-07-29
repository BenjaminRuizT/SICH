const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const k = process.env.ENCRYPTION_KEY;
  if (!k || k.length !== 64) return null;
  return Buffer.from(k, 'hex');
}

// Returns enc:<iv>:<authTag>:<ciphertext> (all hex) or original value if no key/empty
function encrypt(text) {
  if (!text) return text;
  const key = getKey();
  if (!key) return text;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// Handles both encrypted (enc: prefix) and plain (legacy/no-key) values
function decrypt(text) {
  if (!text || !String(text).startsWith('enc:')) return text;
  const key = getKey();
  if (!key) return text;
  try {
    const [, ivHex, authTagHex, dataHex] = String(text).split(':');
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    return decipher.update(Buffer.from(dataHex, 'hex'), null, 'utf8') + decipher.final('utf8');
  } catch { return text; }
}

// Encrypt/decrypt each string element in an array (for foto_condiciones JSONB arrays)
function encryptArr(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => (typeof item === 'string' ? encrypt(item) : item));
}

function decryptArr(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => (typeof item === 'string' ? decrypt(item) : item));
}

module.exports = { encrypt, decrypt, encryptArr, decryptArr };
