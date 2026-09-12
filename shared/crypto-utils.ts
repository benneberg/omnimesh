/**
 * Cryptographic engine for OmniScreenMesh using Web Crypto API.
 * Supports both Node.js (v18+) and browser environments via globalThis.crypto.
 */

function getCrypto(): SubtleCrypto {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API (crypto.subtle) is not available in this environment.");
  }
  return cryptoObj.subtle;
}

export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a new Ed25519 asymmetric cryptographic keypair.
 */
export async function generateDeviceKeypair(): Promise<CryptoKeyPair> {
  const subtle = getCrypto();
  return await subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
}

/**
 * Export CryptoKey to Base64 (SPKI for public, PKCS8 for private).
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const subtle = getCrypto();
  const exported = await subtle.exportKey(
    key.type === "public" ? "spki" : "pkcs8",
    key
  );
  return toBase64(new Uint8Array(exported));
}

/**
 * Import a Base64-encoded key back into a CryptoKey object.
 */
export async function importKey(base64: string, type: "public" | "private"): Promise<CryptoKey> {
  const subtle = getCrypto();
  const bytes = fromBase64(base64);
  return await subtle.importKey(
    type === "public" ? "spki" : "pkcs8",
    bytes,
    { name: "Ed25519" },
    true,
    type === "public" ? ["verify"] : ["sign"]
  );
}

/**
 * Digitally sign an arbitrary string or buffer using an Ed25519 private key.
 * Returns Base64-encoded signature.
 */
export async function signData(privateKey: CryptoKey, data: string | ArrayBuffer): Promise<string> {
  const subtle = getCrypto();
  const encoder = new TextEncoder();
  const encoded = typeof data === "string" ? encoder.encode(data) : data;
  const signature = await subtle.sign(
    { name: "Ed25519" },
    privateKey,
    encoded
  );
  return toBase64(new Uint8Array(signature));
}

/**
 * Verify an Ed25519 signature against data using a public key.
 */
export async function verifyData(publicKey: CryptoKey, signatureBase64: string, data: string | ArrayBuffer): Promise<boolean> {
  try {
    const subtle = getCrypto();
    const encoder = new TextEncoder();
    const encoded = typeof data === "string" ? encoder.encode(data) : data;
    const sigBytes = fromBase64(signatureBase64);
    return await subtle.verify(
      { name: "Ed25519" },
      publicKey,
      sigBytes,
      encoded
    );
  } catch {
    return false;
  }
}

/**
 * Compute SHA-256 hexadecimal hash string for content integrity checking.
 */
export async function computeHash(data: string | ArrayBuffer): Promise<string> {
  const subtle = getCrypto();
  const encoder = new TextEncoder();
  const encoded = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a cryptographically secure random token (e.g. at_mesh_<hex>).
 */
export function generateSecureToken(prefix: string = "at_mesh"): string {
  const randomBytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

/**
 * Verify pairing handshake signature.
 */
export async function verifyChallengeSignature(
  publicKeyBase64: string,
  challengeNonce: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    const pubKey = await importKey(publicKeyBase64, "public");
    return await verifyData(pubKey, signatureBase64, challengeNonce);
  } catch (err) {
    // If public key is invalid or not in Ed25519 format, return false
    return false;
  }
}
