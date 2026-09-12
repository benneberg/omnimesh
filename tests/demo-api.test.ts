import { describe, it, expect, beforeEach } from "vitest";
import { handleDemoApi, resetDemoStorage } from "../src/lib/demo-api";
import type { Device, Playlist, Manifest } from "@shared/types";

describe("In-Browser Demo API Engine", () => {
  beforeEach(() => {
    resetDemoStorage();
  });

  it("GET /devices returns mock fleet in demo mode", async () => {
    const res = await handleDemoApi<{ items: Device[] }>("/devices");
    expect(res.items).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].id).toBe("dev-001");
  });

  it("POST /devices/init creates a pairing challenge and code", async () => {
    const res = await handleDemoApi<{
      deviceId: string;
      pairingCode: string;
      challenge: string;
      status: string;
    }>("/devices/init", {
      method: "POST",
      body: JSON.stringify({
        id: "demo-node-99",
        platform: "webos",
        appVersion: "3.6.0-PROD",
      }),
    });

    expect(res.deviceId).toBe("demo-node-99");
    expect(res.pairingCode).toMatch(/^\d{6}$/);
    expect(res.challenge).toBeDefined();
    expect(res.status).toBe("pairing");
  });

  it("POST /devices/:id/pair validates pairing code and activates node", async () => {
    // First initialize
    const initRes = await handleDemoApi<{
      deviceId: string;
      pairingCode: string;
    }>("/devices/init", {
      method: "POST",
      body: JSON.stringify({ id: "demo-node-100" }),
    });

    // Pair with correct code
    const pairRes = await handleDemoApi<{
      deviceId: string;
      status: string;
      accessToken: string;
    }>("/devices/demo-node-100/pair", {
      method: "POST",
      body: JSON.stringify({
        pairingCode: initRes.pairingCode,
      }),
    });

    expect(pairRes.status).toBe("active");
    expect(pairRes.accessToken).toBeDefined();
  });

  it("GET /devices/:id/playlist returns a cryptographically signed manifest", async () => {
    const manifest = await handleDemoApi<Manifest>("/devices/dev-001/playlist");
    expect(manifest.playlist).toBeDefined();
    expect(manifest.signature).toBeDefined();
    expect(manifest.signerPublicKey).toBeDefined();
    expect(manifest.etag).toBeDefined();
  });

  it("GET /fleet/anomalies runs client anomaly detector", async () => {
    const res = await handleDemoApi<{
      count: number;
      anomalies: unknown[];
      timestamp: number;
    }>("/fleet/anomalies");
    expect(typeof res.count).toBe("number");
    expect(Array.isArray(res.anomalies)).toBe(true);
  });

  it("POST /playlists updates playlist and publishes signed manifest", async () => {
    const res = await handleDemoApi<{ manifest: Manifest; published: boolean }>(
      "/playlists/p-1/publish",
      { method: "POST" }
    );
    expect(res.published).toBe(true);
    expect(res.manifest.playlist.version).toBeGreaterThan(1);
  });
});
