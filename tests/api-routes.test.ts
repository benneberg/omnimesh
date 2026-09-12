import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { userRoutes } from "../worker/user-routes";
import { defaultEnv } from "../worker/core-utils";
import { durableStorage } from "../worker/durable-storage";
import { generateDeviceKeypair, exportKey, signData, importKey, verifyData } from "@shared/crypto-utils";
import { ROOT_PUB_KEY } from "@shared/mock-data";

describe("OmniScreenMesh API v1 Endpoints & Security", () => {
  let app: Hono<{ Bindings: typeof defaultEnv }>;

  beforeEach(() => {
    durableStorage.clearAll();
    app = new Hono<{ Bindings: typeof defaultEnv }>();
    userRoutes(app);
  });

  it("GET /api/v1/devices returns fleet list including seed nodes", async () => {
    const res = await app.request("/api/v1/devices", { method: "GET" }, defaultEnv);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.items)).toBe(true);
    expect(json.data.items.length).toBeGreaterThan(0);
    expect(json.data.items[0].id).toBe("dev-001");
  });

  it("POST /api/v1/devices/init creates node and returns challenge & 6-digit pairing code", async () => {
    const keypair = await generateDeviceKeypair();
    const pubKey = await exportKey(keypair.publicKey);

    const payload = {
      id: "node-terminal-007",
      platform: "webos",
      appVersion: "3.6.0-PROD",
      publicKey: pubKey,
    };

    const res = await app.request(
      "/api/v1/devices/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      defaultEnv
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.deviceId).toBe("node-terminal-007");
    expect(json.data.pairingCode).toMatch(/^\d{6}$/);
    expect(json.data.challenge).toBeDefined();
    expect(json.data.pairingExpiresAt).toBeGreaterThan(Date.now());
  });

  it("POST /api/v1/devices/:id/pair rejects invalid pairing code", async () => {
    const keypair = await generateDeviceKeypair();
    const pubKey = await exportKey(keypair.publicKey);

    await app.request(
      "/api/v1/devices/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "node-fail-001", platform: "tizen", publicKey: pubKey }),
      },
      defaultEnv
    );

    const pairRes = await app.request(
      "/api/v1/devices/node-fail-001/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "000000" }), // Wrong code
      },
      defaultEnv
    );

    expect(pairRes.status).toBe(400);
    const json = await pairRes.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("ERR_INVALID_HANDSHAKE");
  });

  it("POST /api/v1/devices/:id/pair performs full cryptographic challenge verification and issues bearer token", async () => {
    const keypair = await generateDeviceKeypair();
    const pubKey = await exportKey(keypair.publicKey);

    const initRes = await app.request(
      "/api/v1/devices/init",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "node-crypto-verify", platform: "android", publicKey: pubKey }),
      },
      defaultEnv
    );

    const { data: initData } = await initRes.json();
    const { pairingCode, challenge } = initData;

    // Device signs the challenge nonce with its private key
    const signature = await signData(keypair.privateKey, challenge);

    const pairRes = await app.request(
      "/api/v1/devices/node-crypto-verify/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairingCode, signature }),
      },
      defaultEnv
    );

    expect(pairRes.status).toBe(200);
    const pairJson = await pairRes.json();
    expect(pairJson.success).toBe(true);
    expect(pairJson.data.status).toBe("active");
    expect(pairJson.data.accessToken).toMatch(/^at_mesh_/);

    const accessToken = pairJson.data.accessToken;

    // Test Heartbeat: Requires Bearer authentication
    const unauthHeartbeat = await app.request(
      "/api/v1/devices/node-crypto-verify/heartbeat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telemetry: { cpuUsage: 15, memUsage: 35 } }),
      },
      defaultEnv
    );
    expect(unauthHeartbeat.status).toBe(401);

    const authHeartbeat = await app.request(
      "/api/v1/devices/node-crypto-verify/heartbeat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ telemetry: { cpuUsage: 15, memUsage: 35 } }),
      },
      defaultEnv
    );
    expect(authHeartbeat.status).toBe(200);
    const hbJson = await authHeartbeat.json();
    expect(hbJson.success).toBe(true);
    expect(hbJson.data.telemetry.cpuUsage).toBe(15);
  });

  it("POST /api/v1/devices/:id/pop logs proof-of-play and increments global verified plays counter", async () => {
    // dev-001 has mock accessToken 'at_mesh_dev001_mock_session'
    await app.request("/api/v1/devices", { method: "GET" }, defaultEnv);

    const popPayload = {
      id: "pop-001",
      deviceId: "dev-001",
      playlistItemId: "pi-1",
      contentHash: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
      timestamp: Date.now(),
      durationMs: 5000,
      signature: "mock_signature_pop",
    };

    const res = await app.request(
      "/api/v1/devices/dev-001/pop",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer at_mesh_dev001_mock_session",
        },
        body: JSON.stringify(popPayload),
      },
      defaultEnv
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.recorded).toBe(true);

    // Verify system metrics updated
    const metricsRes = await app.request("/api/v1/metrics", { method: "GET" }, defaultEnv);
    const metricsJson = await metricsRes.json();
    expect(metricsJson.data.total_verified_plays).toBeGreaterThanOrEqual(1);
  });

  it("GET & POST & PUBLISH /api/v1/playlists generates authentic Ed25519 signed manifest", async () => {
    // Create new playlist
    const createRes = await app.request(
      "/api/v1/playlists",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Airport Concourse A" }),
      },
      defaultEnv
    );
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    const playlistId = createJson.data.id;
    expect(playlistId).toBeDefined();

    // Publish items
    const publishRes = await app.request(
      `/api/v1/playlists/${playlistId}/publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              id: "item-1",
              type: "video",
              url: "https://example.com/gate_announcement.mp4",
              integrity: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
              durationMs: 12000,
            },
          ],
        }),
      },
      defaultEnv
    );
    expect(publishRes.status).toBe(200);

    // Retrieve signed manifest via assigned device dev-001
    const manifestRes = await app.request(
      "/api/v1/devices/dev-001/playlist",
      {
        method: "GET",
        headers: { Authorization: "Bearer at_mesh_dev001_mock_session" },
      },
      defaultEnv
    );
    expect(manifestRes.status).toBe(200);
    const manifestJson = await manifestRes.json();
    expect(manifestJson.success).toBe(true);

    const manifest = manifestJson.data;
    expect(manifest.signerPublicKey).toBe(ROOT_PUB_KEY);
    expect(manifest.signature).toBeDefined();

    // Cryptographically verify signature using ROOT_PUB_KEY
    const pubKey = await importKey(ROOT_PUB_KEY, "public");
    const canonicalPayload = JSON.stringify({
      id: manifest.playlist.id,
      version: manifest.playlist.version,
      updatedAt: manifest.playlist.updatedAt,
      items: manifest.playlist.items,
    });

    const isSigValid = await verifyData(pubKey, manifest.signature, canonicalPayload);
    expect(isSigValid).toBe(true);
  });

  it("POST /api/v1/org/sso validates SSO config and audit logs changes", async () => {
    const validRes = await app.request(
      "/api/v1/org/sso",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "Okta-SAML", enabled: true }),
      },
      defaultEnv
    );
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.data.updated).toBe(true);

    // Invalid config rejected
    const invalidRes = await app.request(
      "/api/v1/org/sso",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: 123 }),
      },
      defaultEnv
    );
    expect(invalidRes.status).toBe(400);
  });

  it("GET /api/v1/fleet/anomalies returns proactive fleet anomaly report", async () => {
    const res = await app.request("/api/v1/fleet/anomalies", { method: "GET" }, defaultEnv);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.data.count).toBe("number");
    expect(Array.isArray(json.data.anomalies)).toBe(true);
  });
});
