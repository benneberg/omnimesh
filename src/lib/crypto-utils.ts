/**
 * Cryptographic primitives for OmniSign using Web Crypto API.
 */
export async function generateDeviceKeypair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"]
  );
}
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey(
    key.type === "public" ? "spki" : "pkcs8",
    key
  );
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}
export async function importKey(base64: string, type: "public" | "private"): Promise<CryptoKey> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    type === "public" ? "spki" : "pkcs8",
    bytes,
    { name: "Ed25519" },
    true,
    type === "public" ? ["verify"] : ["sign"]
  );
}
export async function signData(privateKey: CryptoKey, data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = typeof data === "string" ? encoder.encode(data) : data;
  const signature = await window.crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
export async function verifyData(publicKey: CryptoKey, signature: string, data: string | ArrayBuffer): Promise<boolean> {
  const encoder = new TextEncoder();
  const encoded = typeof data === "string" ? encoder.encode(data) : data;
  const sigBinary = atob(signature);
  const sigBytes = new Uint8Array(sigBinary.length);
  for (let i = 0; i < sigBinary.length; i++) {
    sigBytes[i] = sigBinary.charCodeAt(i);
  }
  return await window.crypto.subtle.verify(
    { name: "Ed25519" },
    publicKey,
    sigBytes,
    encoded
  );
}
export async function computeHash(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const encoded = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}