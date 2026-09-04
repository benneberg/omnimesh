export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export type DeviceStatus = 'active' | 'offline' | 'pairing' | 'new' | 'emergency_mode';
export type UserRole = 'admin' | 'fleet_manager' | 'content_author';
export type AuthMethod = 'local' | 'sso';
export interface AuditLog {
  id: string;
  timestamp: number;
  event: string;
  level: 'info' | 'warn' | 'error';
  details?: string;
}
export interface PoPLog {
  id: string;
  deviceId: string;
  playlistItemId: string;
  contentHash: string; // SHA256 HEX
  timestamp: number;
  durationMs: number;
  signature: string; // Ed25519 Base64
}
export interface ContentPeer {
  deviceId: string;
  lastSeen: number;
  ipHint?: string;
}
export interface Device {
  id: string;
  orgId: string;
  name: string;
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  lastHeartbeatAt: number;
  assignedPlaylistId?: string;
  pairingCode?: string;
  pairingExpiresAt: number;
  publicKey?: string;
  challenge?: string;
  expectedNonce?: string;
  nextSyncInterval?: number;
  accessToken?: string;
  refreshToken?: string;
  logs: AuditLog[];
  popLogs: PoPLog[];
  p2pSharingEnabled: boolean;
  p2pMetrics: {
    meshHits: number;
    totalFetches: number;
  };
  otaManifest?: Manifest;
  metricsHistory: {
    cpu: number[];
    mem: number[];
    timestamps: number[];
  };
  telemetry: {
    cpuUsage: number;
    memUsage: number;
    diskUsage: number;
    uptimeSeconds: number;
    playbackErrors: string[];
    escalationLevel: 'none' | 'watchdog_recovery' | 'cache_fallback' | 'emergency';
    otaVersion?: string;
    otaStatus?: 'idle' | 'downloading' | 'verifying' | 'applying';
    cpuCores?: number;
    memoryLimit?: number;
  };
}
export type PlaylistItemType = 'image' | 'video' | 'html' | 'url';
export type TransitionType = 'cut' | 'fade';
export interface PlaylistItem {
  id: string;
  type: PlaylistItemType;
  url: string;
  htmlContent?: string;
  integrity: string; // SHA256 HEX
  durationMs: number;
  transition?: TransitionType;
}
export interface Playlist {
  id: string;
  name: string;
  version: number;
  updatedAt: number;
  items: PlaylistItem[];
}
export interface Manifest {
  playlist: Playlist;
  signature: string;
  signerPublicKey: string;
  etag: string;
  issuedAt: number;
  otaSignature?: string;
  otaTargetVersion?: string;
}
export interface DeviceInitResponse {
  deviceId: string;
  pairingCode: string;
  pairingExpiresAt: number;
  challenge: string;
}
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
}
export interface DeviceHeartbeat {
  status: DeviceStatus;
  platform: string;
  appVersion: string;
  telemetry?: Device['telemetry'];
  cpuUsage?: number;
  memUsage?: number;
  storageUsedBytes?: number;
  storageTotalBytes?: number;
  uptimeSeconds?: number;
  playbackErrors?: string[];
  nonce?: string;
  challenge?: string;
  signature?: string;
}
export interface User {
  id: string;
  name: string;
  role: UserRole;
  authMethod: AuthMethod;
  email?: string;
  orgId: string;
}
export interface SsoConfig {
  enabled: boolean;
  provider: 'okta' | 'azure' | 'google' | 'oidc';
  entryPoint: string;
  issuer: string;
  certificate?: string;
}
/**
 * System-wide aggregation state for observability.
 */
export interface MetricsStateResponse {
  total_heartbeats: number;
  successful_pairings: number;
  total_verified_plays: number;
  mesh_savings_total: number;
  mesh_announcements: number;
  active_nodes: number;
  last_updated: number;
  timestamp: number; // Added for time-series aggregation compliance
  [key: string]: number;
}
export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}