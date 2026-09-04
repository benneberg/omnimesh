import { Entity, IndexedEntity, Index } from "./core-utils";
import type { Device, Playlist, DeviceHeartbeat, Manifest, AuditLog, PoPLog, ContentPeer, DeviceInitResponse } from "@shared/types";
import { MOCK_DEVICES, MOCK_PLAYLISTS, ROOT_PUB_KEY } from "@shared/mock-data";
export interface MetricsState {
  total_heartbeats: number;
  successful_pairings: number;
  total_verified_plays: number;
  mesh_savings_total: number;
  mesh_announcements: number;
  active_nodes: number;
  last_updated: number;
  [key: string]: number;
}
export class SystemMetricsEntity extends Entity<MetricsState> {
  static readonly entityName = "sys-metrics";
  static readonly initialState: MetricsState = {
    total_heartbeats: 0,
    successful_pairings: 0,
    total_verified_plays: 0,
    mesh_savings_total: 0,
    mesh_announcements: 0,
    active_nodes: 0,
    last_updated: 0
  };
  async incrementCounter(name: string, value: number = 1): Promise<number> {
    const next = await this.mutate(s => ({
      ...s,
      [name]: (typeof s[name] === 'number' ? (s[name] as number) : 0) + value,
      last_updated: Date.now()
    }));
    return next[name] as number;
  }
}
export interface RateLimitState {
  count: number;
  lastReset: number;
}
export class RateLimitEntity extends Entity<RateLimitState> {
  static readonly entityName = "rate-limit";
  static readonly initialState: RateLimitState = {
    count: 0,
    lastReset: 0
  };
  async checkLimit(limit: number, windowMs: number): Promise<{ current: number; allowed: boolean }> {
    const now = Date.now();
    const state = await this.mutate(s => {
      const isExpired = now - s.lastReset > windowMs;
      if (isExpired) return { count: 1, lastReset: now };
      return { ...s, count: s.count + 1 };
    });
    return { current: state.count, allowed: state.count <= limit };
  }
}
export class ContentRegistry extends Index<string> {
  static readonly indexName = "mesh-content-peers";
  static async announce(env: any, hash: string, deviceId: string): Promise<void> {
    const idx = new Index<string>(env, `peers:${hash}`);
    await idx.add(deviceId);
  }
  static async getPeers(env: any, hash: string): Promise<ContentPeer[]> {
    const idx = new Index<string>(env, `peers:${hash}`);
    const ids = await idx.list();
    return ids.map(id => ({ deviceId: id, lastSeen: Date.now() }));
  }
}
export class DeviceEntity extends IndexedEntity<Device> {
  static readonly entityName = "device";
  static readonly indexName = "devices";
  static readonly initialState: Device = {
    id: "", orgId: "default", name: "New Device", status: "new", platform: "unknown",
    appVersion: "0.0.0", lastHeartbeatAt: 0, pairingExpiresAt: 0, logs: [], popLogs: [],
    p2pSharingEnabled: true, p2pMetrics: { meshHits: 0, totalFetches: 0 },
    metricsHistory: { cpu: [], mem: [], timestamps: [] },
    telemetry: { cpuUsage: 0, memUsage: 0, diskUsage: 0, uptimeSeconds: 0, playbackErrors: [], escalationLevel: 'none' }
  };
  static seedData = MOCK_DEVICES;
  static async init(env: any, id: string, platform: string, appVersion: string, publicKey: string): Promise<DeviceInitResponse> {
    const dev = new DeviceEntity(env, id);
    if (!await dev.exists()) {
      await DeviceEntity.create(env, { ...DeviceEntity.initialState, id, platform, appVersion, publicKey });
    }
    return dev.generatePairingCode(publicKey);
  }
  async recordPoP(log: PoPLog): Promise<void> {
    await this.mutate(s => ({
      ...s,
      popLogs: [log, ...(s.popLogs || [])].slice(0, 100)
    }));
  }
  async generatePairingCode(publicKey?: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const challenge = crypto.randomUUID();
    await this.mutate(s => ({
      ...s, pairingCode: code, pairingExpiresAt: Date.now() + 600000, challenge, status: 'pairing', publicKey: publicKey || s.publicKey
    }));
    return { deviceId: this.id, pairingCode: code, pairingExpiresAt: Date.now() + 600000, challenge };
  }
  async verifyPairing(code: string, signature?: string): Promise<boolean> {
    const state = await this.getState();
    if (state.pairingCode !== code) return false;
    await this.mutate(s => ({
      ...s, status: 'active', pairingCode: undefined, accessToken: `at_${crypto.randomUUID()}`
    }));
    return true;
  }
  async heartbeat(data: DeviceHeartbeat): Promise<Device> {
    return this.mutate(s => ({
      ...s,
      lastHeartbeatAt: Date.now(),
      telemetry: { ...s.telemetry, ...data.telemetry },
      metricsHistory: {
        cpu: [...(s.metricsHistory?.cpu || []), (data.telemetry?.cpuUsage ?? 0)].slice(-20),
        mem: [...(s.metricsHistory?.mem || []), (data.telemetry?.memUsage ?? 0)].slice(-20),
        timestamps: [...(s.metricsHistory?.timestamps || []), Date.now()].slice(-20)
      }
    }));
  }
}
export class PlaylistEntity extends IndexedEntity<Playlist> {
  static readonly entityName = "playlist";
  static readonly indexName = "playlists";
  static readonly initialState: Playlist = { id: "", name: "New Playlist", version: 1, updatedAt: Date.now(), items: [] };
  static seedData = MOCK_PLAYLISTS;
  static async createNew(env: any, name: string): Promise<Playlist> {
    const id = `p-${crypto.randomUUID().slice(0, 8)}`;
    return await PlaylistEntity.create(env, { ...PlaylistEntity.initialState, id, name });
  }
  async publish(items: Playlist['items']): Promise<Playlist> {
    return this.mutate(s => ({ ...s, items, version: s.version + 1, updatedAt: Date.now() }));
  }
  async getSignedManifest(): Promise<Manifest> {
    const playlist = await this.getState();
    return { playlist, signature: `sig_${crypto.randomUUID()}`, signerPublicKey: ROOT_PUB_KEY, etag: `W/"${playlist.version}"`, issuedAt: Date.now() };
  }
}