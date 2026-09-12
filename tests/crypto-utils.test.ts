import { describe, it, expect } from "vitest";
import {
  generateDeviceKeypair,
  exportKey,
  importKey,
  signData,
  verifyData,
  computeHash,
  generateSecureToken,
  verifyChallengeSignature,
} from "@shared/crypto-utils";
import { ROOT_PUB_KEY, ROOT_PRIV_KEY } from "@shared/mock-data";

describe("Web Crypto Cryptographic Engine", () => {
  it("generates and exports Ed25519 keypair", async () => {
    const keypair = await generateDeviceKeypair();
    expect(keypair).toBeDefined();
    expect(keypair.publicKey).toBeDefined();
    expect(keypair.privateKey).toBeDefined();

    const pubB64 = await exportKey(keypair.publicKey);
    const privB64 = await exportKey(keypair.privateKey);

    expect(typeof pubB64).toBe("string");
    expect(typeof privB64).toBe("string");
    expect(pubB64.length).toBeGreaterThan(20);
    expect(privB64.length).toBeGreaterThan(20);
  });

  it("imports exported keys and performs valid digital signing & verification", async () => {
    const keypair = await generateDeviceKeypair();
    const pubB64 = await exportKey(keypair.publicKey);
    const privB64 = await exportKey(keypair.privateKey);

    const reimportedPub = await importKey(pubB64, "public");
    const reimportedPriv = await importKey(privB64, "private");

    const message = "screenmesh-manifest-v2-integrity-check";
    const signature = await signData(reimportedPriv, message);

    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    const isValid = await verifyData(reimportedPub, signature, message);
    expect(isValid).toBe(true);
  });

  it("detects tampered payload or signature", async () => {
    const keypair = await generateDeviceKeypair();
    const message = "valid-payload-data";
    const signature = await signData(keypair.privateKey, message);

    // Tampered payload
    const tamperedPayloadResult = await verifyData(keypair.publicKey, signature, "tampered-payload-data");
    expect(tamperedPayloadResult).toBe(false);

    // Tampered signature
    const corruptSignature = signature.slice(0, -4) + "AAAA";
    const tamperedSigResult = await verifyData(keypair.publicKey, corruptSignature, message);
    expect(tamperedSigResult).toBe(false);
  });

  it("verifies root authority keypair defined in mock-data", async () => {
    const pubKey = await importKey(ROOT_PUB_KEY, "public");
    const privKey = await importKey(ROOT_PRIV_KEY, "private");

    const manifestPayload = JSON.stringify({
      id: "p-test",
      version: 1,
      items: [{ id: "pi-1", url: "https://example.com/asset.mp4" }],
    });

    const signature = await signData(privKey, manifestPayload);
    const isValid = await verifyData(pubKey, signature, manifestPayload);
    expect(isValid).toBe(true);
  });

  it("computes deterministic SHA-256 hex digests", async () => {
    const hash1 = await computeHash("omni-screenmesh-2026");
    const hash2 = await computeHash("omni-screenmesh-2026");
    const hash3 = await computeHash("different-content");

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("generates cryptographically secure access tokens", () => {
    const token1 = generateSecureToken("at_mesh");
    const token2 = generateSecureToken("at_mesh");

    expect(token1.startsWith("at_mesh_")).toBe(true);
    expect(token2.startsWith("at_mesh_")).toBe(true);
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(40);
  });

  it("verifies challenge-response pairing signatures", async () => {
    const kp = await generateDeviceKeypair();
    const pubB64 = await exportKey(kp.publicKey);
    const challenge = "random-nonce-123456789";

    const signature = await signData(kp.privateKey, challenge);
    const verified = await verifyChallengeSignature(pubB64, challenge, signature);
    expect(verified).toBe(true);

    const invalid = await verifyChallengeSignature(pubB64, "different-nonce", signature);
    expect(invalid).toBe(false);
  });
});
