import type { Device, Playlist } from './types';
export const ROOT_PUB_KEY = "MCowBQYDK2VwAyEAcXSF9vY8G2xHwAOv2dlNw1sW5Toa4BvGSW1gAefSFZQ=";
export const ROOT_PRIV_KEY = "MC4CAQAwBQYDK2VwBCIEIILz1v8vRpKwFVbBKnKBVeCb9RaUEQNOl8X9+cCqrr23";
export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'p-1',
    name: 'Main Entrance Grid',
    version: 1,
    updatedAt: Date.now(),
    items: [
      {
        id: 'pi-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
        integrity: 'pending',
        durationMs: 5000,
      },
      {
        id: 'pi-2',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        integrity: 'pending',
        durationMs: 15000,
      }
    ]
  }
];
const now = Date.now();
const generateMetrics = () => ({
  cpu: Array.from({ length: 20 }, () => Math.floor(Math.random() * 10) + 2),
  mem: Array.from({ length: 20 }, () => Math.floor(Math.random() * 5) + 30),
  timestamps: Array.from({ length: 20 }, (_, i) => now - (19 - i) * 60000)
});
export const MOCK_DEVICES: Device[] = [
  {
    id: 'dev-001',
    orgId: 'org-1',
    name: 'Lobby Simulator',
    status: 'active',
    platform: 'webos',
    appVersion: '3.0.0-PROD',
    publicKey: ROOT_PUB_KEY,
    lastHeartbeatAt: now - 30000,
    pairingExpiresAt: 0,
    assignedPlaylistId: 'p-1',
    accessToken: 'at_mesh_dev001_mock_session',
    popLogs: [],
    p2pSharingEnabled: true,
    p2pMetrics: {
      meshHits: 45,
      totalFetches: 100
    },
    logs: [{ id: 'l-init-1', timestamp: now - 3600000, event: 'Node Cold Boot', level: 'info' }],
    metricsHistory: generateMetrics(),
    telemetry: {
      cpuUsage: 2,
      memUsage: 30,
      diskUsage: 12,
      uptimeSeconds: 3600,
      playbackErrors: [],
      escalationLevel: 'none',
      cpuCores: 8,
      memoryLimit: 8192
    }
  }
];