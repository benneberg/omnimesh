import type { Device, Playlist, Manifest, DeviceHeartbeat, PoPLog, AuditLog } from '@shared/types';
import { MOCK_DEVICES, MOCK_PLAYLISTS, ROOT_PUB_KEY } from '@shared/mock-data';
import { detectAnomalies } from './anomaly-engine';
import { generateSecureToken, computeHash } from '@shared/crypto-utils';

const STORAGE_KEYS = {
  DEVICES: 'omnisign_demo_devices',
  PLAYLISTS: 'omnisign_demo_playlists',
  SSO: 'omnisign_demo_sso',
  METRICS: 'omnisign_demo_metrics',
};

const memoryStorage = new Map<string, string>();

function getStorage() {
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, val: string) => memoryStorage.set(key, val),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
  };
}

export function resetDemoStorage(): void {
  const store = getStorage();
  store.removeItem(STORAGE_KEYS.DEVICES);
  store.removeItem(STORAGE_KEYS.PLAYLISTS);
  store.removeItem(STORAGE_KEYS.SSO);
  store.removeItem(STORAGE_KEYS.METRICS);
}

function getStoredDevices(): Device[] {
  const store = getStorage();
  try {
    const raw = store.getItem(STORAGE_KEYS.DEVICES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[DEMO_STORAGE] Failed to parse stored devices, falling back to mock:', e);
  }
  // Initialize with clone of mock devices
  const initial = JSON.parse(JSON.stringify(MOCK_DEVICES));
  saveStoredDevices(initial);
  return initial;
}

function saveStoredDevices(devices: Device[]): void {
  const store = getStorage();
  try {
    store.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  } catch (e) {
    console.warn('[DEMO_STORAGE] Failed to save devices:', e);
  }
}

function getStoredPlaylists(): Playlist[] {
  const store = getStorage();
  try {
    const raw = store.getItem(STORAGE_KEYS.PLAYLISTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[DEMO_STORAGE] Failed to parse stored playlists:', e);
  }
  const initial = JSON.parse(JSON.stringify(MOCK_PLAYLISTS));
  saveStoredPlaylists(initial);
  return initial;
}

function saveStoredPlaylists(playlists: Playlist[]): void {
  const store = getStorage();
  try {
    store.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  } catch (e) {
    console.warn('[DEMO_STORAGE] Failed to save playlists:', e);
  }
}

function getStoredSso() {
  const store = getStorage();
  try {
    const raw = store.getItem(STORAGE_KEYS.SSO);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, provider: 'okta' };
}

function saveStoredSso(config: { enabled: boolean; provider: string }) {
  const store = getStorage();
  try {
    store.setItem(STORAGE_KEYS.SSO, JSON.stringify(config));
  } catch {}
}

export async function handleDemoApi<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const clean = path.replace(/^\/api\/v1\/?/, '').replace(/^\/v1\/?/, '').replace(/^\//, '').replace(/\/$/, '');
  const segments = clean.split('/');
  const body = init?.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : null;

  // Simulate minimal realistic async network delay (20ms - 80ms)
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 60) + 20));

  // 1. Health check
  if (clean === 'health' || clean === 'api/health') {
    return { status: 'healthy', timestamp: new Date().toISOString(), mode: 'client-demo' } as unknown as T;
  }

  // 2. SSO Configuration
  if (clean === 'org/sso') {
    if (method === 'GET') {
      return getStoredSso() as unknown as T;
    }
    if (method === 'POST') {
      const config = {
        enabled: Boolean(body?.enabled),
        provider: body?.provider || 'okta',
      };
      saveStoredSso(config);
      return { updated: true, ...config } as unknown as T;
    }
  }

  // 3. Anomalies Engine
  if (clean === 'fleet/anomalies') {
    const devices = getStoredDevices();
    const anomalies = devices.map(d => detectAnomalies(d)).filter(a => a.severity !== 'Nominal');
    return {
      count: anomalies.length,
      anomalies,
      timestamp: Date.now(),
    } as unknown as T;
  }

  // 4. Global System Metrics
  if (clean === 'metrics') {
    const devices = getStoredDevices();
    const now = Date.now();
    const activeNodes = devices.filter(d => d.status === 'active' && now - d.lastHeartbeatAt < 120000).length;
    let totalVerifiedPlays = 0;
    let meshSavings = 0;
    devices.forEach(d => {
      totalVerifiedPlays += d.popLogs?.length || 0;
      meshSavings += d.p2pMetrics?.meshHits || 0;
    });

    return {
      total_heartbeats: devices.length * 150 + totalVerifiedPlays,
      successful_pairings: devices.filter(d => d.status === 'active').length,
      total_verified_plays: totalVerifiedPlays + 42,
      mesh_savings_total: meshSavings * 4.2 + 18.5,
      mesh_announcements: devices.length * 2,
      active_nodes: activeNodes || devices.length,
      last_updated: Date.now(),
    } as unknown as T;
  }

  // 5. Playlists Endpoints
  if (segments[0] === 'playlists') {
    const playlists = getStoredPlaylists();

    // GET /playlists
    if (segments.length === 1 && method === 'GET') {
      return { items: playlists } as unknown as T;
    }

    // POST /playlists (create)
    if (segments.length === 1 && method === 'POST') {
      const newPlaylist: Playlist = {
        id: body?.id || `p-${Date.now()}`,
        name: body?.name || 'Untitled Playlist',
        version: 1,
        updatedAt: Date.now(),
        items: body?.items || [],
      };
      playlists.unshift(newPlaylist);
      saveStoredPlaylists(playlists);
      return newPlaylist as unknown as T;
    }

    const playlistId = segments[1];

    // POST /playlists/:id/publish
    if (segments.length === 3 && segments[2] === 'publish' && method === 'POST') {
      const idx = playlists.findIndex(p => p.id === playlistId);
      const incoming = (body as Playlist) || (idx !== -1 ? playlists[idx] : null);
      if (!incoming) throw new Error('Playlist not found');

      const updatedPlaylist: Playlist = {
        ...incoming,
        id: playlistId,
        version: (incoming.version || 1) + 1,
        updatedAt: Date.now(),
      };

      if (idx !== -1) {
        playlists[idx] = updatedPlaylist;
      } else {
        playlists.push(updatedPlaylist);
      }
      saveStoredPlaylists(playlists);

      const contentHash = await computeHash(JSON.stringify(updatedPlaylist));
      const manifest: Manifest = {
        playlist: updatedPlaylist,
        signature: `ed25519_demo_sig_${contentHash.slice(0, 32)}`,
        signerPublicKey: ROOT_PUB_KEY,
        etag: `"${updatedPlaylist.id}-${updatedPlaylist.version}-${updatedPlaylist.updatedAt}"`,
        issuedAt: Date.now(),
      };

      return { manifest, published: true } as unknown as T;
    }

    // GET /playlists/:id
    if (segments.length === 2 && method === 'GET') {
      const found = playlists.find(p => p.id === playlistId);
      if (!found) throw new Error('Playlist not found');
      return found as unknown as T;
    }

    // DELETE /playlists/:id
    if (segments.length === 2 && method === 'DELETE') {
      const filtered = playlists.filter(p => p.id !== playlistId);
      saveStoredPlaylists(filtered);
      return { success: true } as unknown as T;
    }
  }

  // 6. Devices Endpoints
  if (segments[0] === 'devices') {
    const devices = getStoredDevices();

    // GET /devices
    if (segments.length === 1 && method === 'GET') {
      return { items: devices } as unknown as T;
    }

    // POST /devices/init
    if (segments.length === 2 && segments[1] === 'init' && method === 'POST') {
      const deviceId = body?.id || `node-${Math.random().toString(36).substring(2, 9)}`;
      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      const challenge = generateSecureToken('challenge');
      const pairingExpiresAt = Date.now() + 600000; // 10 mins

      let device = devices.find(d => d.id === deviceId);
      if (!device) {
        device = {
          id: deviceId,
          orgId: 'org-omnisign',
          name: `Node ${deviceId.slice(-6)}`,
          status: 'pairing',
          platform: body?.platform || 'webos',
          appVersion: body?.appVersion || '3.6.0-PROD',
          publicKey: body?.publicKey || ROOT_PUB_KEY,
          lastHeartbeatAt: Date.now(),
          pairingCode,
          pairingExpiresAt,
          challenge,
          assignedPlaylistId: 'p-1',
          popLogs: [],
          p2pSharingEnabled: true,
          p2pMetrics: { meshHits: 0, totalFetches: 0 },
          logs: [{
            id: `log-${Date.now()}`,
            timestamp: Date.now(),
            event: 'Node Registered in Demo Sandbox',
            level: 'info'
          }],
          metricsHistory: {
            cpu: [2, 3, 4, 2, 5],
            mem: [28, 29, 30, 30, 31],
            timestamps: [Date.now() - 4000, Date.now() - 3000, Date.now() - 2000, Date.now() - 1000, Date.now()]
          },
          telemetry: {
            cpuUsage: 3.5,
            memUsage: 30,
            diskUsage: 14,
            uptimeSeconds: 120,
            playbackErrors: [],
            escalationLevel: 'none',
          }
        };
        devices.unshift(device);
      } else {
        device.pairingCode = pairingCode;
        device.pairingExpiresAt = pairingExpiresAt;
        device.challenge = challenge;
        device.status = 'pairing';
      }
      saveStoredDevices(devices);

      return {
        deviceId,
        challenge,
        pairingCode,
        pairingExpiresAt,
        status: 'pairing',
      } as unknown as T;
    }

    const deviceId = segments[1];
    const device = devices.find(d => d.id === deviceId);

    // POST /devices/:id/pair
    if (segments.length === 3 && segments[2] === 'pair' && method === 'POST') {
      if (!device) throw new Error('Device not found');
      const enteredCode = body?.pairingCode?.trim();
      if (!enteredCode || enteredCode !== device.pairingCode) {
        throw new Error('Invalid or expired pairing code');
      }

      const accessToken = generateSecureToken(`at_${deviceId}`);
      device.status = 'active';
      device.accessToken = accessToken;
      device.lastHeartbeatAt = Date.now();
      device.logs.push({
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
        event: 'Cryptographic Handshake Succeeded (Demo Mode)',
        level: 'info'
      });
      saveStoredDevices(devices);

      return {
        deviceId,
        status: 'active',
        accessToken,
        nextSyncInterval: 30,
      } as unknown as T;
    }

    // POST /devices/:id/heartbeat
    if (segments.length === 3 && segments[2] === 'heartbeat' && method === 'POST') {
      if (!device) throw new Error('Device not found');
      const hb = body as DeviceHeartbeat;
      device.lastHeartbeatAt = Date.now();
      if (hb?.cpuUsage !== undefined) device.telemetry.cpuUsage = hb.cpuUsage;
      if (hb?.memUsage !== undefined) device.telemetry.memUsage = hb.memUsage;
      if (hb?.telemetry?.diskUsage !== undefined) device.telemetry.diskUsage = hb.telemetry.diskUsage;
      if (hb?.uptimeSeconds !== undefined) device.telemetry.uptimeSeconds = hb.uptimeSeconds;
      if (hb?.playbackErrors) device.telemetry.playbackErrors = hb.playbackErrors;
      if (hb?.status) device.status = hb.status;

      // Update metrics history
      device.metricsHistory.cpu.push(device.telemetry.cpuUsage);
      if (device.metricsHistory.cpu.length > 20) device.metricsHistory.cpu.shift();
      device.metricsHistory.mem.push(device.telemetry.memUsage);
      if (device.metricsHistory.mem.length > 20) device.metricsHistory.mem.shift();
      device.metricsHistory.timestamps.push(Date.now());
      if (device.metricsHistory.timestamps.length > 20) device.metricsHistory.timestamps.shift();

      saveStoredDevices(devices);

      return {
        status: 'ok',
        nextSyncInterval: 30,
        assignedPlaylistId: device.assignedPlaylistId || 'p-1',
      } as unknown as T;
    }

    // GET /devices/:id/playlist (Signed Manifest)
    if (segments.length === 3 && segments[2] === 'playlist' && method === 'GET') {
      const playlists = getStoredPlaylists();
      const targetId = device?.assignedPlaylistId || 'p-1';
      const playlist = playlists.find(p => p.id === targetId) || playlists[0] || MOCK_PLAYLISTS[0];

      const manifest: Manifest = {
        playlist,
        signature: `demo_ed25519_sig_${playlist.id}_v${playlist.version}`,
        signerPublicKey: ROOT_PUB_KEY,
        etag: `"${playlist.id}-${playlist.version}-${playlist.updatedAt}"`,
        issuedAt: Date.now(),
      };
      return manifest as unknown as T;
    }

    // POST /devices/:id/pop (Proof of Play)
    if (segments.length === 3 && segments[2] === 'pop' && method === 'POST') {
      if (device) {
        const popLog: PoPLog = {
          id: `pop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          deviceId,
          playlistItemId: body?.playlistItemId || 'pi-1',
          contentHash: body?.contentHash || 'demo_hash',
          timestamp: body?.timestamp || Date.now(),
          durationMs: body?.durationMs || 10000,
          signature: body?.signature || 'verified',
        };
        device.popLogs = device.popLogs || [];
        device.popLogs.unshift(popLog);
        if (device.popLogs.length > 50) device.popLogs.pop();
        saveStoredDevices(devices);
      }
      return { status: 'verified', logId: `pop-${Date.now()}` } as unknown as T;
    }

    // GET /devices/:id
    if (segments.length === 2 && method === 'GET') {
      if (!device) throw new Error('Device not found');
      return device as unknown as T;
    }
  }

  throw new Error(`[DEMO_API] Unsupported route: ${method} ${clean}`);
}
